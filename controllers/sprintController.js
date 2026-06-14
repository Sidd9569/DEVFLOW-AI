const Sprint = require('../models/Sprint');
const Product = require('../models/Product');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const logger = require('../utils/logger');

const createSprint = async (req, res) => {
  try {
    const { name, startDate, endDate, goal, productId, product } = req.body;
    const sprintProductId = productId || product;

    const productRecord = await Product.findById(sprintProductId);
    if (!productRecord) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const isTeamMember = productRecord.team.some(
      member => member.toString() === req.userId.toString()
    );

    if (!isTeamMember && productRecord.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create sprints for this product'
      });
    }

    const sprint = await Sprint.create({
      name,
      product: sprintProductId,
      startDate,
      endDate,
      goal
    });

    await Activity.create({
      user: req.userId,
      action: 'create',
      entityType: 'sprint',
      entityId: sprint._id,
      entityName: name,
      product: sprintProductId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const io = req.app.get('io');
    io.to(`product-${sprintProductId}`).emit('sprint-created', sprint);

    res.status(201).json({
      success: true,
      sprint
    });
  } catch (error) {
    logger.error(`Create sprint error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error creating sprint'
    });
  }
};

const getSprints = async (req, res) => {
  try {
    const { productId } = req.query;
    let sprints;

    if (productId) {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }

      const isTeamMember = product.team.some(
        member => member.toString() === req.userId.toString()
      );

      if (!isTeamMember && product.owner.toString() !== req.userId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view sprints for this product'
        });
      }

      sprints = await Sprint.find({ product: productId })
        .populate({ path: 'tasks', select: 'title status' })
        .populate({ path: 'product', select: 'name owner', populate: { path: 'owner', select: 'firstName lastName' } })
        .sort({ startDate: -1 });
    } else {
      const accessibleProducts = await Product.find({
        $or: [
          { owner: req.userId },
          { team: req.userId }
        ]
      }).select('_id');

      const productIds = accessibleProducts.map(p => p._id);
      if (productIds.length === 0) {
        return res.status(200).json({
          success: true,
          sprints: []
        });
      }

      sprints = await Sprint.find({ product: { $in: productIds } })
        .populate({ path: 'tasks', select: 'title status' })
        .populate({ path: 'product', select: 'name owner team', populate: [
          { path: 'owner', select: 'firstName lastName' },
          { path: 'team', select: 'firstName lastName' }
        ] })
        .sort({ startDate: -1 });
    }

    res.status(200).json({
      success: true,
      sprints
    });
  } catch (error) {
    logger.error(`Get sprints error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching sprints'
    });
  }
};

const getSprint = async (req, res) => {
  try {
    const { id } = req.params;

    const sprint = await Sprint.findById(id)
      .populate('tasks')
      .populate('product');

    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: 'Sprint not found'
      });
    }

    const product = sprint.product;
    const isTeamMember = product.team.some(
      member => member.toString() === req.userId.toString()
    );

    if (!isTeamMember && product.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this sprint'
      });
    }

    res.status(200).json({
      success: true,
      sprint
    });
  } catch (error) {
    logger.error(`Get sprint error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching sprint'
    });
  }
};

const updateSprint = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startDate, endDate, goal, status } = req.body;

    const sprint = await Sprint.findById(id).populate('product');

    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: 'Sprint not found'
      });
    }

    const product = sprint.product;
    const isTeamMember = product.team.some(
      member => member.toString() === req.userId.toString()
    );

    if (!isTeamMember && product.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this sprint'
      });
    }

    const previousValue = { 
      name: sprint.name, 
      startDate: sprint.startDate, 
      endDate: sprint.endDate,
      status: sprint.status
    };

    sprint.name = name || sprint.name;
    sprint.startDate = startDate || sprint.startDate;
    sprint.endDate = endDate || sprint.endDate;
    sprint.goal = goal !== undefined ? goal : sprint.goal;
    sprint.status = status || sprint.status;

    await sprint.save();

    await Activity.create({
      user: req.userId,
      action: 'update',
      entityType: 'sprint',
      entityId: sprint._id,
      entityName: sprint.name,
      product: product._id,
      previousValue,
      newValue: { name, startDate, endDate, status },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const io = req.app.get('io');
    io.to(`product-${product._id}`).emit('sprint-updated', sprint);

    res.status(200).json({
      success: true,
      sprint
    });
  } catch (error) {
    logger.error(`Update sprint error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error updating sprint'
    });
  }
};

const deleteSprint = async (req, res) => {
  try {
    const { id } = req.params;

    const sprint = await Sprint.findById(id).populate('product');

    if (!sprint) {
      return res.status(404).json({
        success: false,
        message: 'Sprint not found'
      });
    }

    const product = sprint.product;
    const isTeamMember = product.team.some(
      member => member.toString() === req.userId.toString()
    );

    if (!isTeamMember && product.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this sprint'
      });
    }

    await Activity.create({
      user: req.userId,
      action: 'delete',
      entityType: 'sprint',
      entityId: sprint._id,
      entityName: sprint.name,
      product: product._id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await Task.updateMany({ sprint: id }, { $unset: { sprint: 1 } });
    await Sprint.findByIdAndDelete(id);

    const io = req.app.get('io');
    io.to(`product-${product._id}`).emit('sprint-deleted', { sprintId: id });

    res.status(200).json({
      success: true,
      message: 'Sprint deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete sprint error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error deleting sprint'
    });
  }
};

const getSprintStats = async (req, res) => {
  try {
    const { productId } = req.params;

    const sprints = await Sprint.find({ product: productId });
    
    const stats = {
      total: sprints.length,
      active: sprints.filter(s => s.status === 'active').length,
      completed: sprints.filter(s => s.status === 'completed').length,
      overdue: sprints.filter(s => s.isOverdue()).length
    };

    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error(`Get sprint stats error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching sprint stats'
    });
  }
};

module.exports = {
  createSprint,
  getSprints,
  getSprint,
  updateSprint,
  deleteSprint,
  getSprintStats
};
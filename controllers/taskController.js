const mongoose = require('mongoose');
const Task = require('../models/Task');
const Product = require('../models/Product');
const Sprint = require('../models/Sprint');
const Activity = require('../models/Activity');
const logger = require('../utils/logger');

const createTask = async (req, res) => {
  try {
    const { title, description, productId, sprintId, assignee, priority, storyPoints, dueDate, tags } = req.body;

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
        message: 'Not authorized to create tasks for this product'
      });
    }

    const task = await Task.create({
      title,
      description,
      product: productId,
      sprint: sprintId,
      assignee,
      reporter: req.userId,
      priority,
      storyPoints,
      dueDate,
      tags
    });

    if (sprintId) {
      await Sprint.findByIdAndUpdate(sprintId, {
        $push: { tasks: task._id }
      });
    }

    await Activity.create({
      user: req.userId,
      action: 'create',
      entityType: 'task',
      entityId: task._id,
      entityName: title,
      product: productId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const io = req.app.get('io');
    io.to(`product-${productId}`).emit('task-created', task);

    res.status(201).json({
      success: true,
      task
    });
  } catch (error) {
    logger.error(`Create task error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error creating task'
    });
  }
};

const getTasks = async (req, res) => {
  try {
    const { productId, sprintId, status, assignee } = req.query;
    const query = {};
    let productIds = [];

    if (productId) {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid productId'
        });
      }

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
          message: 'Not authorized to view tasks for this product'
        });
      }

      productIds = [product._id];
    } else {
      const products = await Product.find({
        $or: [
          { owner: req.userId },
          { team: req.userId }
        ]
      }).select('_id');

      productIds = products.map(p => p._id);
      if (productIds.length === 0) {
        return res.status(200).json({
          success: true,
          tasks: []
        });
      }
    }

    query.product = { $in: productIds };

    if (sprintId) {
      if (!mongoose.Types.ObjectId.isValid(sprintId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid sprintId'
        });
      }
      query.sprint = sprintId;
    }

    if (status) query.status = status;
    if (assignee) query.assignee = assignee;

    const tasks = await Task.find(query)
      .populate('assignee', 'firstName lastName avatar')
      .populate('reporter', 'firstName lastName avatar')
      .sort({ order: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      tasks
    });
  } catch (error) {
    logger.error(`Get tasks error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching tasks'
    });
  }
};

const getTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id)
      .populate('assignee', 'firstName lastName email avatar')
      .populate('reporter', 'firstName lastName email avatar')
      .populate('comments.user', 'firstName lastName avatar');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const product = await Product.findById(task.product);
    const isTeamMember = product.team.some(
      member => member.toString() === req.userId.toString()
    );

    if (!isTeamMember && product.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this task'
      });
    }

    res.status(200).json({
      success: true,
      task
    });
  } catch (error) {
    logger.error(`Get task error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching task'
    });
  }
};

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, assignee, storyPoints, dueDate, tags } = req.body;

    const task = await Task.findById(id).populate('product');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const product = task.product;
    const isTeamMember = product.team.some(
      member => member.toString() === req.userId.toString()
    );

    if (!isTeamMember && product.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this task'
      });
    }

    const previousValue = {
      title: task.title,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee
    };

    task.title = title || task.title;
    task.description = description !== undefined ? description : task.description;
    task.status = status || task.status;
    task.priority = priority || task.priority;
    task.assignee = assignee !== undefined ? assignee : task.assignee;
    task.storyPoints = storyPoints !== undefined ? storyPoints : task.storyPoints;
    task.dueDate = dueDate || task.dueDate;
    task.tags = tags || task.tags;

    await task.save();

    await Activity.create({
      user: req.userId,
      action: 'update',
      entityType: 'task',
      entityId: task._id,
      entityName: task.title,
      product: product._id,
      previousValue,
      newValue: { title, status, priority, assignee },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const io = req.app.get('io');
    io.to(`product-${product._id}`).emit('task-updated', task);

    res.status(200).json({
      success: true,
      task
    });
  } catch (error) {
    logger.error(`Update task error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error updating task'
    });
  }
};

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id).populate('product');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const product = task.product;
    const isTeamMember = product.team.some(
      member => member.toString() === req.userId.toString()
    );

    if (!isTeamMember && product.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this task'
      });
    }

    await Activity.create({
      user: req.userId,
      action: 'delete',
      entityType: 'task',
      entityId: task._id,
      entityName: task.title,
      product: product._id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    if (task.sprint) {
      await Sprint.findByIdAndUpdate(task.sprint, {
        $pull: { tasks: task._id }
      });
    }

    await Task.findByIdAndDelete(id);

    const io = req.app.get('io');
    io.to(`product-${product._id}`).emit('task-deleted', { taskId: id });

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete task error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error deleting task'
    });
  }
};

const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const task = await Task.findById(id).populate('product');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const product = task.product;
    const isTeamMember = product.team.some(
      member => member.toString() === req.userId.toString()
    );

    if (!isTeamMember && product.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this task'
      });
    }

    const previousStatus = task.status;
    task.status = status;
    await task.save();

    await Activity.create({
      user: req.userId,
      action: 'status-change',
      entityType: 'task',
      entityId: task._id,
      entityName: task.title,
      product: product._id,
      previousValue: { status: previousStatus },
      newValue: { status },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const io = req.app.get('io');
    io.to(`product-${product._id}`).emit('task-status-changed', {
      taskId: id,
      status,
      previousStatus
    });

    res.status(200).json({
      success: true,
      task
    });
  } catch (error) {
    logger.error(`Update task status error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error updating task status'
    });
  }
};

const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    const task = await Task.findById(id).populate('product');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const product = task.product;
    const isTeamMember = product.team.some(
      member => member.toString() === req.userId.toString()
    );

    if (!isTeamMember && product.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to comment on this task'
      });
    }

    const comment = {
      user: req.userId,
      text
    };

    task.comments.push(comment);
    await task.save();

    await Activity.create({
      user: req.userId,
      action: 'comment',
      entityType: 'task',
      entityId: task._id,
      entityName: task.title,
      product: product._id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const io = req.app.get('io');
    io.to(`product-${product._id}`).emit('task-comment-added', {
      taskId: id,
      comment
    });

    res.status(200).json({
      success: true,
      task
    });
  } catch (error) {
    logger.error(`Add comment error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error adding comment'
    });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  addComment
};
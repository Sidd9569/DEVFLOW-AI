const mongoose = require('mongoose');
const Issue = require('../models/Issue');
const Product = require('../models/Product');
const Activity = require('../models/Activity');
const logger = require('../utils/logger');

const createIssue = async (req, res) => {
  try {
    const { title, description, productId, assignee, priority, type, labels, dueDate } = req.body;

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
        message: 'Not authorized to create issues for this product'
      });
    }

    const issue = await Issue.create({
      title,
      description,
      product: productId,
      reporter: req.userId,
      assignee,
      priority,
      type,
      labels,
      dueDate
    });

    await Activity.create({
      user: req.userId,
      action: 'create',
      entityType: 'issue',
      entityId: issue._id,
      entityName: title,
      product: productId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const io = req.app.get('io');
    io.to(`product-${productId}`).emit('issue-created', issue);

    res.status(201).json({
      success: true,
      issue
    });
  } catch (error) {
    logger.error(`Create issue error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error creating issue'
    });
  }
};

const getIssues = async (req, res) => {
  try {
    const { productId, status, type, priority, assignee } = req.query;
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
          message: 'Not authorized to view issues for this product'
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
          issues: []
        });
      }
    }

    query.product = { $in: productIds };
    if (status) query.status = status;
    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (assignee) query.assignee = assignee;

    const issues = await Issue.find(query)
      .populate('assignee', 'firstName lastName avatar')
      .populate('reporter', 'firstName lastName avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      issues
    });
  } catch (error) {
    logger.error(`Get issues error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching issues'
    });
  }
};

const getIssue = async (req, res) => {
  try {
    const { id } = req.params;

    const issue = await Issue.findById(id)
      .populate('assignee', 'firstName lastName email avatar')
      .populate('reporter', 'firstName lastName email avatar')
      .populate('comments.user', 'firstName lastName avatar');

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    const product = await Product.findById(issue.product);
    const isTeamMember = product.team.some(
      member => member.toString() === req.userId.toString()
    );

    if (!isTeamMember && product.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this issue'
      });
    }

    res.status(200).json({
      success: true,
      issue
    });
  } catch (error) {
    logger.error(`Get issue error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching issue'
    });
  }
};

const updateIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, type, assignee, labels, dueDate } = req.body;

    const issue = await Issue.findById(id).populate('product');

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    const product = issue.product;
    const isTeamMember = product.team.some(
      member => member.toString() === req.userId.toString()
    );

    if (!isTeamMember && product.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this issue'
      });
    }

    const previousValue = {
      title: issue.title,
      status: issue.status,
      priority: issue.priority,
      assignee: issue.assignee
    };

    issue.title = title || issue.title;
    issue.description = description !== undefined ? description : issue.description;
    issue.status = status || issue.status;
    issue.priority = priority || issue.priority;
    issue.type = type || issue.type;
    issue.assignee = assignee !== undefined ? assignee : issue.assignee;
    issue.labels = labels || issue.labels;
    issue.dueDate = dueDate || issue.dueDate;

    await issue.save();

    await Activity.create({
      user: req.userId,
      action: 'update',
      entityType: 'issue',
      entityId: issue._id,
      entityName: issue.title,
      product: product._id,
      previousValue,
      newValue: { title, status, priority, assignee },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const io = req.app.get('io');
    io.to(`product-${product._id}`).emit('issue-updated', issue);

    res.status(200).json({
      success: true,
      issue
    });
  } catch (error) {
    logger.error(`Update issue error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error updating issue'
    });
  }
};

const deleteIssue = async (req, res) => {
  try {
    const { id } = req.params;

    const issue = await Issue.findById(id).populate('product');

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    const product = issue.product;
    const isTeamMember = product.team.some(
      member => member.toString() === req.userId.toString()
    );

    if (!isTeamMember && product.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this issue'
      });
    }

    await Activity.create({
      user: req.userId,
      action: 'delete',
      entityType: 'issue',
      entityId: issue._id,
      entityName: issue.title,
      product: product._id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await Issue.findByIdAndDelete(id);

    const io = req.app.get('io');
    io.to(`product-${product._id}`).emit('issue-deleted', { issueId: id });

    res.status(200).json({
      success: true,
      message: 'Issue deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete issue error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error deleting issue'
    });
  }
};

const addIssueComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    const issue = await Issue.findById(id).populate('product');

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Issue not found'
      });
    }

    const product = issue.product;
    const isTeamMember = product.team.some(
      member => member.toString() === req.userId.toString()
    );

    if (!isTeamMember && product.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to comment on this issue'
      });
    }

    const comment = {
      user: req.userId,
      text
    };

    issue.comments.push(comment);
    await issue.save();

    await Activity.create({
      user: req.userId,
      action: 'comment',
      entityType: 'issue',
      entityId: issue._id,
      entityName: issue.title,
      product: product._id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const io = req.app.get('io');
    io.to(`product-${product._id}`).emit('issue-comment-added', {
      issueId: id,
      comment
    });

    res.status(200).json({
      success: true,
      issue
    });
  } catch (error) {
    logger.error(`Add issue comment error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error adding comment'
    });
  }
};

const getIssueStats = async (req, res) => {
  try {
    const { productId } = req.query;

    const issues = await Issue.find({ product: productId });

    const stats = {
      total: issues.length,
      open: issues.filter(i => i.status === 'open').length,
      inProgress: issues.filter(i => i.status === 'in-progress').length,
      resolved: issues.filter(i => i.status === 'resolved').length,
      closed: issues.filter(i => i.status === 'closed').length,
      byPriority: {
        critical: issues.filter(i => i.priority === 'critical').length,
        high: issues.filter(i => i.priority === 'high').length,
        medium: issues.filter(i => i.priority === 'medium').length,
        low: issues.filter(i => i.priority === 'low').length
      },
      byType: {
        bug: issues.filter(i => i.type === 'bug').length,
        feature: issues.filter(i => i.type === 'feature').length,
        improvement: issues.filter(i => i.type === 'improvement').length,
        task: issues.filter(i => i.type === 'task').length
      }
    };

    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error(`Get issue stats error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching issue stats'
    });
  }
};

module.exports = {
  createIssue,
  getIssues,
  getIssue,
  updateIssue,
  deleteIssue,
  addIssueComment,
  getIssueStats
};
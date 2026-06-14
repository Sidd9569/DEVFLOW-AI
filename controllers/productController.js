const Product = require('../models/Product');
const User = require('../models/User');
const Activity = require('../models/Activity');
const logger = require('../utils/logger');

const createProduct = async (req, res) => {
  try {
    const { name, description, startupIdea, aiGenerated } = req.body;

    const product = await Product.create({
      name,
      description,
      owner: req.userId,
      team: [req.userId],
      startupIdea,
      aiGenerated: aiGenerated || false
    });

    await User.findByIdAndUpdate(req.userId, {
      $push: { products: product._id }
    });

    await Activity.create({
      user: req.userId,
      action: 'create',
      entityType: 'product',
      entityId: product._id,
      entityName: name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      product
    });
  } catch (error) {
    logger.error(`Create product error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error creating product'
    });
  }
};

const getProducts = async (req, res) => {
  try {
    const products = await Product.find({
      $or: [
        { owner: req.userId },
        { team: req.userId }
      ]
    }).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      products
    });
  } catch (error) {
    logger.error(`Get products error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching products'
    });
  }
};

const getProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id)
      .populate('owner', 'firstName lastName email')
      .populate('team', 'firstName lastName email avatar');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const isTeamMember = product.team.some(
      member => member._id.toString() === req.userId.toString()
    );

    if (!isTeamMember && product.owner._id.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this product'
      });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    logger.error(`Get product error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching product'
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status } = req.body;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (product.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this product'
      });
    }

    const previousValue = { name: product.name, description: product.description };
    
    product.name = name || product.name;
    product.description = description !== undefined ? description : product.description;
    product.status = status || product.status;

    await product.save();

    await Activity.create({
      user: req.userId,
      action: 'update',
      entityType: 'product',
      entityId: product._id,
      entityName: product.name,
      previousValue,
      newValue: { name, description },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    logger.error(`Update product error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error updating product'
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (product.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this product'
      });
    }

    await Activity.create({
      user: req.userId,
      action: 'delete',
      entityType: 'product',
      entityId: product._id,
      entityName: product.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await Product.findByIdAndDelete(id);
    await User.updateMany({ products: id }, { $pull: { products: id } });

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete product error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error deleting product'
    });
  }
};

const addTeamMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (product.owner.toString() !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add team members'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (product.team.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already a team member'
      });
    }

    product.team.push(userId);
    await product.save();

    await User.findByIdAndUpdate(userId, {
      $push: { products: id }
    });

    await Activity.create({
      user: req.userId,
      action: 'assign',
      entityType: 'product',
      entityId: product._id,
      entityName: product.name,
      metadata: { addedUser: userId },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Team member added successfully'
    });
  } catch (error) {
    logger.error(`Add team member error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error adding team member'
    });
  }
};

module.exports = {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  addTeamMember
};
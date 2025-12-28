import FarmTransaction from '../models/farm.model.js';
import mongoose from 'mongoose';

// Create
export const createTransaction = async (req, res) => {
    // Require authentication for creating a transaction
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    try {
        const transactionData = {
            ...req.body,
            createdBy: req.user._id
        };
        const transaction = new FarmTransaction(transactionData);
        await transaction.save();
        res.status(201).json(transaction);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Read all
export const getAllTransactions = async (req, res) => {
  try {
    // Show only transactions created by the authenticated user
    const transactions = await FarmTransaction.find({ createdBy: req.user._id });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Updated getPublicTransactions in farm.controller.js
export const getPublicTransactions = async (req, res) => {
  try {
    const transactions = await FarmTransaction.find()
      .populate({
        path: 'createdBy',
        select: 'userName email phone role address district sector cell village status',
        match: { _id: { $exists: true } }
      })
      .select('-__v')
      .sort({ date: -1 });
    
    // Filter out transactions where createdBy is null
    const validTransactions = transactions.filter(t => t.createdBy !== null);
    
    res.json(validTransactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Read by ID
export const getTransactionById = async (req, res) => {
  try {
    const transaction = await FarmTransaction.findOne({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    });
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update
export const updateTransaction = async (req, res) => {
  try {
    const transaction = await FarmTransaction.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete
export const deleteTransaction = async (req, res) => {
  try {
    const transaction = await FarmTransaction.findOneAndDelete({ 
      _id: req.params.id, 
      createdBy: req.user._id 
    });
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
import mongoose from 'mongoose';

const supportSettingSchema = new mongoose.Schema(
  {
    customerPhone: {
      type: String,
      default: '+91 63774 60692',
      trim: true,
    },
    customerEmail: {
      type: String,
      default: 'sreplwm@gmail.com',
      trim: true,
    },
    customerHours: {
      type: String,
      default: '24/7 Priority Support',
      trim: true,
    },
    sellerPhone: {
      type: String,
      default: '+91 63774 60692',
      trim: true,
    },
    sellerEmail: {
      type: String,
      default: 'sreplwm@gmail.com',
      trim: true,
    },
    sellerHours: {
      type: String,
      default: 'Mon - Sat (9 AM - 8 PM)',
      trim: true,
    },
    captainPhone: {
      type: String,
      default: '+91 63774 60692',
      trim: true,
    },
    captainEmail: {
      type: String,
      default: 'sreplwm@gmail.com',
      trim: true,
    },
    captainHours: {
      type: String,
      default: '24/7 Active Dispatch Line',
      trim: true,
    },
    whatsappNumber: {
      type: String,
      default: '+91 63774 60692',
      trim: true,
    },
    // Customer website footer (managed by admin)
    footerBrandName: { type: String, default: 'Natural Agro Farm', trim: true, maxlength: 60 },
    footerTagline: { type: String, default: 'Fresh groceries, staples and daily essentials from stores near you, delivered fast to your doorstep.', trim: true, maxlength: 240 },
    footerPhone: { type: String, default: '+91 81029 14300', trim: true, maxlength: 30 },
    footerEmail: { type: String, default: 'sreplwm@gmail.com', trim: true, maxlength: 120 },
    footerAddress: { type: String, default: '', trim: true, maxlength: 300 },
    footerHours: { type: String, default: '', trim: true, maxlength: 80 },
    bannerTitle: {
      type: String,
      default: "We're here to help",
      trim: true,
    },
    bannerSubtitle: {
      type: String,
      default: 'Have an issue with your order or want to share feedback? Connect with us directly.',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const SupportSetting = mongoose.model('SupportSetting', supportSettingSchema);

export default SupportSetting;

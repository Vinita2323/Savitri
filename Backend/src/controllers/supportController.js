import SupportSetting from '../models/SupportSetting.model.js';

const DEFAULT_SETTINGS = {
  customerPhone: '+91 63774 60692',
  customerEmail: 'sreplwm@gmail.com',
  customerHours: '24/7 Priority Support',
  sellerPhone: '+91 63774 60692',
  sellerEmail: 'sreplwm@gmail.com',
  sellerHours: 'Mon - Sat (9 AM - 8 PM)',
  captainPhone: '+91 63774 60692',
  captainEmail: 'sreplwm@gmail.com',
  captainHours: '24/7 Active Dispatch Line',
  whatsappNumber: '+91 63774 60692',
  footerBrandName: 'Savitri',
  footerTagline: 'Fresh groceries, staples and daily essentials from stores near you, delivered fast to your doorstep.',
  footerPhone: '+91 81029 14300',
  footerEmail: 'sreplwm@gmail.com',
  footerAddress: '',
  footerHours: '',
  bannerTitle: "We're here to help",
  bannerSubtitle: 'Have an issue with your order or want to share feedback? Connect with us directly.',
};

const FOOTER_FIELDS = ['footerBrandName', 'footerTagline', 'footerPhone', 'footerEmail', 'footerAddress', 'footerHours'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @desc Get current platform support & contact settings
 * @route GET /api/support-settings
 * @access Public
 */
export const getSupportSettings = async (req, res) => {
  try {
    let settings = await SupportSetting.findOne().lean();
    if (!settings) {
      settings = await SupportSetting.create(DEFAULT_SETTINGS);
    }
    const withDefaults = { ...settings };
    for (const k of FOOTER_FIELDS) if (withDefaults[k] === undefined || withDefaults[k] === null) withDefaults[k] = DEFAULT_SETTINGS[k];
    res.status(200).json({ success: true, settings: withDefaults });
  } catch (error) {
    console.error('Error fetching support settings:', error);
    res.status(200).json({ success: true, settings: DEFAULT_SETTINGS });
  }
};

/**
 * @desc Update platform support & contact settings
 * @route PUT /api/support-settings
 * @access Admin
 */
export const updateSupportSettings = async (req, res) => {
  try {
    let settings = await SupportSetting.findOne();
    if (!settings) {
      settings = new SupportSetting(DEFAULT_SETTINGS);
    }

    const {
      customerPhone,
      customerEmail,
      customerHours,
      sellerPhone,
      sellerEmail,
      sellerHours,
      captainPhone,
      captainEmail,
      captainHours,
      whatsappNumber,
      bannerTitle,
      bannerSubtitle,
    } = req.body;

    // Website footer fields: validated before anything is saved
    const footer = {};
    for (const k of FOOTER_FIELDS) {
      if (req.body[k] === undefined) continue;
      const v = String(req.body[k] ?? '').trim();
      footer[k] = v;
    }
    if (footer.footerBrandName !== undefined && footer.footerBrandName.length === 0) return res.status(400).json({ success: false, message: 'Footer brand name cannot be empty' });
    if (footer.footerEmail !== undefined && footer.footerEmail && !EMAIL_RE.test(footer.footerEmail)) return res.status(400).json({ success: false, message: 'Footer email is not a valid email address' });
    if (footer.footerPhone !== undefined && footer.footerPhone && !/^[+\d][\d\s()-]{6,24}$/.test(footer.footerPhone)) return res.status(400).json({ success: false, message: 'Footer phone number is not valid' });
    const limits = { footerBrandName: 60, footerTagline: 240, footerPhone: 30, footerEmail: 120, footerAddress: 300, footerHours: 80 };
    for (const [k, v] of Object.entries(footer)) if (v.length > limits[k]) return res.status(400).json({ success: false, message: `${k} is too long (max ${limits[k]} characters)` });
    for (const [k, v] of Object.entries(footer)) settings[k] = v;

    if (customerPhone !== undefined) settings.customerPhone = customerPhone.trim();
    if (customerEmail !== undefined) settings.customerEmail = customerEmail.trim();
    if (customerHours !== undefined) settings.customerHours = customerHours.trim();
    if (sellerPhone !== undefined) settings.sellerPhone = sellerPhone.trim();
    if (sellerEmail !== undefined) settings.sellerEmail = sellerEmail.trim();
    if (sellerHours !== undefined) settings.sellerHours = sellerHours.trim();
    if (captainPhone !== undefined) settings.captainPhone = captainPhone.trim();
    if (captainEmail !== undefined) settings.captainEmail = captainEmail.trim();
    if (captainHours !== undefined) settings.captainHours = captainHours.trim();
    if (whatsappNumber !== undefined) settings.whatsappNumber = whatsappNumber.trim();
    if (bannerTitle !== undefined) settings.bannerTitle = bannerTitle.trim();
    if (bannerSubtitle !== undefined) settings.bannerSubtitle = bannerSubtitle.trim();

    await settings.save();

    res.status(200).json({
      success: true,
      message: 'Support settings updated successfully',
      settings,
    });
  } catch (error) {
    console.error('Error updating support settings:', error);
    res.status(500).json({ success: false, message: 'Server error updating support settings' });
  }
};

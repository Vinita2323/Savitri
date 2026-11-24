import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, Clock, Store, MapPin } from 'lucide-react';
import supportService from '../../../services/supportService';

// Shown until the admin-managed settings load (and if they cannot be loaded). Admin edits these under
// Support & FAQs > "Customer Website Footer".
const DEFAULTS = {
  footerBrandName: 'Natural Agro Farm',
  footerTagline: 'Fresh groceries, staples and daily essentials from stores near you, delivered fast to your doorstep.',
  footerPhone: '+91 81029 14300',
  footerEmail: 'sreplwm@gmail.com',
  footerAddress: '',
  footerHours: '',
};

const telHref = (raw) => `tel:${String(raw || '').replace(/[^\d+]/g, '')}`;

const FooterLink = ({ to, children }) => (
  <li>
    <Link to={to} className="text-[14px] text-slate-300 hover:text-white no-underline transition-colors">{children}</Link>
  </li>
);

const Column = ({ title, children }) => (
  <div>
    <h4 className="text-[13px] font-extrabold uppercase tracking-wider text-[#F7941D] m-0 mb-4">{title}</h4>
    <ul className="list-none p-0 m-0 flex flex-col gap-2.5">{children}</ul>
  </div>
);

/** Website footer. Shown on tablets and desktops only; phones keep the bottom navigation bar. */
export default function UserFooter() {
  const [cfg, setCfg] = useState(DEFAULTS);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await supportService.getSupportSettings();
        if (alive && res) {
          // only the footer fields; an unset field keeps its default, an emptied field is hidden
          const next = {};
          Object.keys(DEFAULTS).forEach((k) => { if (res[k] !== undefined && res[k] !== null) next[k] = String(res[k]); });
          setCfg((prev) => ({ ...prev, ...next }));
        }
      } catch (e) { /* defaults stay */ }
    })();
    return () => { alive = false; };
  }, []);

  const brand = cfg.footerBrandName.trim() || DEFAULTS.footerBrandName;
  const email = cfg.footerEmail.trim();
  const phone = cfg.footerPhone.trim();
  const address = cfg.footerAddress.trim();
  const hours = cfg.footerHours.trim();
  const tagline = cfg.footerTagline.trim();

  return (
    <footer data-testid="user-footer" className="hidden md:block bg-[#1A2E0A] text-white mt-10 font-sans">
      <div className="w-full px-6 lg:px-8 pt-12 pb-8">
        <div className="grid grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.3fr] gap-x-10 gap-y-10">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-3 no-underline">
              <div className="w-12 h-12 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0">
                <img src="/LogoSavitri.png" alt={brand} className="w-full h-full object-contain" />
              </div>
              <span data-testid="footer-brand" className="text-2xl font-black tracking-tight text-white leading-none">{brand}</span>
            </Link>
            {tagline && <p className="text-[14px] text-slate-300 leading-relaxed mt-4 mb-5 max-w-sm">{tagline}</p>}
            {address && (
              <p data-testid="footer-address" className="flex items-start gap-2.5 text-[14px] text-slate-300 leading-relaxed mt-3 mb-5 max-w-sm whitespace-pre-line">
                <MapPin size={16} className="text-[#F7941D] shrink-0 mt-0.5" />{address}
              </p>
            )}
            <Link to="/seller/register" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#F7941D]/60 text-[#F7941D] hover:bg-[#F7941D] hover:text-white text-[13px] font-bold no-underline transition-colors">
              <Store size={16} /> Sell on {brand}
            </Link>
          </div>

          <Column title="Shop">
            <FooterLink to="/">Home</FooterLink>
            <FooterLink to="/categories">All Categories</FooterLink>
            <FooterLink to="/sellers">Stores</FooterLink>
            <FooterLink to="/flash-sale">Flash Deals</FooterLink>
            <FooterLink to="/bestseller">Best Sellers</FooterLink>
          </Column>

          <Column title="My Account">
            <FooterLink to="/orders">My Orders</FooterLink>
            <FooterLink to="/wishlist">Wishlist</FooterLink>
            <FooterLink to="/cart">Cart</FooterLink>
            <FooterLink to="/saved-addresses">Saved Addresses</FooterLink>
            <FooterLink to="/wallet">Wallet</FooterLink>
          </Column>

          <Column title="Help & Contact">
            <FooterLink to="/support">Help &amp; Support</FooterLink>
            <FooterLink to="/faqs">FAQs</FooterLink>
            <FooterLink to="/privacy">Privacy &amp; Terms</FooterLink>
            {phone && (
              <li className="mt-1">
                <a href={telHref(phone)} className="flex items-center gap-2.5 text-[14px] text-slate-300 hover:text-white no-underline transition-colors"><Phone size={15} className="text-[#F7941D] shrink-0" />{phone}</a>
              </li>
            )}
            {email && (
              <li>
                <a href={`mailto:${email}`} className="flex items-center gap-2.5 text-[14px] text-slate-300 hover:text-white no-underline transition-colors break-all"><Mail size={15} className="text-[#F7941D] shrink-0" />{email}</a>
              </li>
            )}
            {hours && (
              <li className="flex items-center gap-2.5 text-[13px] text-slate-400"><Clock size={15} className="text-[#F7941D] shrink-0" />{hours}</li>
            )}
          </Column>
        </div>

        <div className="border-t border-white/10 mt-10 pt-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[13px] text-slate-400">
          <span>© {new Date().getFullYear()} {brand}. All rights reserved.</span>
          <span className="flex items-center gap-4">
            <Link to="/privacy" className="text-slate-400 hover:text-white no-underline">Privacy Policy</Link>
            <Link to="/privacy" className="text-slate-400 hover:text-white no-underline">Terms of Use</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

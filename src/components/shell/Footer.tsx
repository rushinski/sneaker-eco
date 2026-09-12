// src/components/shell/Footer.tsx
import Link from "next/link";
import { Instagram, MapPin, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-black border-t border-zinc-800 mt-20 pb-32 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          {/* Brand */}
          <div className="lg:col-span-2">
            <h3 className="text-white font-bold text-lg mb-4">REALDEALKICKZSC</h3>
            <p className="text-zinc-500 text-sm mb-6">
              Premium sneakers and streetwear. Authenticity guaranteed.
            </p>
          </div>

          {/* Contact Information */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-zinc-500 text-sm">
                <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <a
                  href="mailto:realdealholyspill@gmail.com"
                  className="hover:text-white transition-colors"
                >
                  realdealholyspill@gmail.com
                </a>
              </li>
              <li className="flex items-start gap-2 text-zinc-500 text-sm">
                <Instagram className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <a
                  href="https://instagram.com/realdealkickzsc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  @realdealkickzsc
                </a>
              </li>
              <li className="flex items-start gap-2 text-zinc-500 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="hover:text-white transition-colors">
                  Simpsonville, SC
                </span>
              </li>
            </ul>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Shop</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/store"
                  className="text-zinc-500 hover:text-white text-sm transition-colors"
                >
                  All Products
                </Link>
              </li>
              <li>
                <Link
                  href="/store?category=sneakers"
                  className="text-zinc-500 hover:text-white text-sm transition-colors"
                >
                  Sneakers
                </Link>
              </li>
              <li>
                <Link
                  href="/store?category=clothing"
                  className="text-zinc-500 hover:text-white text-sm transition-colors"
                >
                  Clothing
                </Link>
              </li>
              <li>
                <Link
                  href="/store?category=accessories"
                  className="text-zinc-500 hover:text-white text-sm transition-colors"
                >
                  Accessories
                </Link>
              </li>
              <li>
                <Link
                  href="/store?category=electronics"
                  className="text-zinc-500 hover:text-white text-sm transition-colors"
                >
                  Electronics
                </Link>
              </li>
            </ul>
          </div>

          {/* Support & Social */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Info</h4>
            <ul className="space-y-2 mb-6">
              <li>
                <Link
                  href="/contact"
                  className="text-zinc-500 hover:text-white text-sm transition-colors"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  href="/bug-report"
                  className="text-zinc-500 hover:text-white text-sm transition-colors"
                >
                  Bug Report
                </Link>
              </li>
              <li>
                <Link
                  href="/hours"
                  className="text-zinc-500 hover:text-white text-sm transition-colors"
                >
                  Hours
                </Link>
              </li>
              <li>
                <Link
                  href="/shipping"
                  className="text-zinc-500 hover:text-white text-sm transition-colors"
                >
                  Shipping
                </Link>
              </li>
              <li>
                <Link
                  href="/refunds"
                  className="text-zinc-500 hover:text-white text-sm transition-colors"
                >
                  Returns &amp; Refunds
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-zinc-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-zinc-400 text-xs sm:text-[11px] text-center sm:text-left">
            © 2026 Realdealkickzsc. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/terms"
              className="text-zinc-400 hover:text-white text-xs transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-zinc-400 hover:text-white text-xs transition-colors"
            >
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

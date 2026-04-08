# Lynxo – Last-Mile Delivery & Order Management Starter Kit

A production-ready, open-source starter kit for building **offline order receiving apps** for on-demand services and local commerce. Built with **React**, **TypeScript**, and **Vite**.

## 🎯 What is Lynxo?

Lynxo is a **fully functional frontend template** for launching:

- **🚰 Service Bookings** – Water delivery, gas cylinders, home maintenance, cleaning services
- **🛒 Retail & Grocery Delivery** – Local grocery stores, restaurant orders, pharmacy delivery
- **📦 Hyperlocal Commerce** – Any business needing order collection + last-mile delivery

**Why Lynxo + Tradly?**
- **Tradly** = Headless commerce platform (product listings, inventory, checkout, payments)
- **Lynxo** = Delivery-focused customer-facing app (orders, real-time tracking, fulfillment)

Together, they give you a **complete stack in days, not months**.

## 🚀 Quick Start Features

### 📱 Customer-Facing App
- **Live Product Listings** – Real-time inventory from Tradly
- **Smart Search & Filters** – Find products by category or search
- **Easy Checkout** – Add items, set delivery slot, track order
- **Real-time Tracking** – Order status updates every 10 seconds
- **Mobile-First** – Works perfectly on phones and tablets

### 🔗 Tradly Integration (Pre-built)
- **Product Sync** – Automatically pulls listings, prices, inventory from Tradly
- **User Authentication** – Email/OTP registration built-in
- **Real Orders** – Orders sync to Tradly for fulfillment tracking
- **Payment Methods** – Dynamically fetch available payment options
- **Shipping Methods** – Support pickup, delivery, or custom logistics

### 💪 Production Ready
- **Offline-First** – Works with mock data; switch to live API anytime
- **Error Handling** – Graceful fallbacks if API is unavailable
- **TypeScript** – Full type safety across the codebase
- **Responsive Design** – Built with Tailwind CSS (looks great on all screens)

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19 + TypeScript |
| **Build** | Vite 7 |
| **State** | Zustand 5 |
| **Styling** | Tailwind CSS 3 |
| **Icons** | Lucide React |
| **Commerce Backend** | Tradly Platform API |

## 📋 Prerequisites

- **Node.js** ≥ 18
- **npm** or **yarn**
- **Tradly Account** (optional, but recommended for live testing)
  - Sign up at https://tradly.app/signup
  - Get your **publishable API key** from SuperAdmin > Settings > API

## 🚀 Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/TRADLY-PLATFORM/Lynxo.git
cd Lynxo
npm install
```

### 2. Run in Mock Mode (No API Key Needed)

```bash
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173). App works with built-in demo data.

### 3. Connect to Your Tradly Store (Optional)

Create `.env.local`:

```env
VITE_TRADLY_PUBLISHABLE_KEY=pk_live_your_key_here
VITE_TRADLY_BASE_URL=https://api.tradly.app
VITE_TRADLY_CURRENCY=USD
```

Reload your app—now pulling real products from your Tradly account! 🎉

### 4. Build for Production

```bash
npm run build
```

Outputs optimized build to `dist/`. Ready for deployment.

## 📁 Project Structure

```
src/
├── pages/                    # Page components
│   ├── Home.tsx             # Product listing & search
│   ├── Checkout.tsx         # Cart review, user info, order placement
│   └── Tracking.tsx         # Real-time order status
├── components/              # Reusable UI components
├── store/
│   └── useStore.ts          # Zustand store (cart, orders, Tradly session)
├── lib/
│   ├── tradlyApi.ts         # Tradly API client
│   └── data/
│       └── products.ts      # Mock product data (fallback)
├── styles/
│   └── index.css            # Tailwind imports
└── App.tsx                  # Root component
```

## 🔌 Tradly API Integration

### Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/products/v1/listings` | Fetch product listings |
| `GET` | `/v1/categories` | Fetch product categories |
| `POST` | `/v1/users/register` | Register new user |
| `POST` | `/v1/users/login` | Login existing user |
| `POST` | `/v1/users/verify` | Verify OTP after registration |
| `POST` | `/v1/addresses` | Create delivery address |
| `GET` | `/v1/tenants/payment_methods` | Fetch available payment methods |
| `GET` | `/v1/tenants/shipping_methods` | Fetch available shipping methods |
| `POST` | `/products/v1/cart` | Add item to user's cart |
| `DELETE` | `/products/v1/cart` | Clear user's cart |
| `POST` | `/products/v1/cart/checkout` | Place real order |
| `GET` | `/products/v1/orders/{id}` | Fetch order details & status |

### Authentication

All API requests include:
- **Header:** `Authorization: Bearer {publishable_key}`
- **User-specific endpoints** also include: `X-Auth-Key: {user_auth_key}` (received after login)

### Order Flow

```
User adds items
    ↓
User clicks "Place Order"
    ↓
Login or Register (if Tradly enabled)
    ↓
OTP Verification (if new user)
    ↓
Create delivery address
    ↓
Sync local cart → Tradly
    ↓
Fetch payment & shipping methods
    ↓
POST checkout → Real order created
    ↓
Track order in real-time
```

## 🎨 App Pages

**Home (`/`)**
- Product grid with live inventory
- Category & search filters
- Product detail modal

**Cart (`/cart`)**
- View items, update quantities
- Order summary with delivery fee

**Checkout (`/checkout`)**
- User details & delivery address
- Delivery time slot selection
- OTP verification (if new user)
- Order placement

**Tracking (`/tracking`)**
- Real-time order status
- Delivery time estimate
- Order reference number

## 🔐 State Management (Zustand)

The app uses Zustand for simple, scalable state:

```typescript
// Cart & Orders
cart, addToCart, removeFromCart, cartTotal(), cartCount()
orders, currentOrderId, placeOrderAsync()

// Tradly User Session
tradlyUser, verifySession, loginOrRegisterUser()

// Products
tradlyProducts, productsLoading, fetchProducts()
```

Data persists to localStorage for returning customers.

## 📝 Environment Variables

### `.env.local` (Create this – do NOT commit)

```env
# Leave empty to use mock data (perfect for development)
VITE_TRADLY_PUBLISHABLE_KEY=

# Or fill in your live API key
VITE_TRADLY_PUBLISHABLE_KEY=pk_live_your_key_here
VITE_TRADLY_BASE_URL=https://api.tradly.app
VITE_TRADLY_CURRENCY=USD
```

## 🧪 Development

### Lint

```bash
npm run lint
```

### Build Check

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## 📚 Key Files

| File | Purpose |
|------|---------|
| `src/lib/tradlyApi.ts` | Tradly API client + types |
| `src/store/useStore.ts` | Cart, orders, auth state |
| `src/pages/Home.tsx` | Product listing + filters |
| `src/pages/Checkout.tsx` | Order placement flow |
| `src/pages/Tracking.tsx` | Real-time order tracking |
| `.env.local` | YOUR API KEY (never commit) |

## 🐛 Troubleshooting

### Products not showing?
1. Check `.env.local` – is `VITE_TRADLY_PUBLISHABLE_KEY` set?
2. If empty, app uses mock data (expected)
3. If set, check browser console for API errors
4. Verify API key is valid at https://tradly.app

### Checkout failing?
1. Ensure name, email, and address are filled
2. Check browser console for API errors
3. App falls back to local orders if API fails

### TypeScript errors on build?
- Don't use `public x: string` in constructors
- Use explicit fields: `public x: string; constructor(x) { this.x = x; }`

## 📖 Learn More

- **Tradly Docs:** https://developer.tradly.app
- **React Docs:** https://react.dev
- **Vite Docs:** https://vite.dev
- **Zustand Docs:** https://github.com/pmndrs/zustand
- **Tailwind Docs:** https://tailwindcss.com

## 📄 License

Part of the TRADLY-PLATFORM ecosystem. See `LICENSE` file.

## 💬 Support

- Issues: GitHub issues on this repo
- Tradly API help: https://developer.tradly.app
- Community: TRADLY platform forums

---

**Lynxo = Template. Tradly = Backend. Your app = Built! 🚀**

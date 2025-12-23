/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
```

### 3. Kiểm tra cấu trúc thư mục

Đảm bảo cấu trúc như sau:
```
tempo-payment-app/
├── app/
│   ├── page.tsx
│   ├── layout.tsx
│   └── globals.css
├── components/
│   └── TempoDApp.tsx    ← Tên file phải viết hoa đúng
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
└── tsconfig.json
# 🎭 Bollywood Beatz - Dance Attendance App

A modern, offline-first dance class management application built with Next.js, TypeScript, and Tailwind CSS.

## ✨ Features

- **📱 Offline-First**: Works completely without internet - data stored locally
- **👥 Student Management**: Add, move, and archive students across classes
- **📋 Attendance Tracking**: Take attendance with Present/Late/Absent/Excused marks
- **🏆 Points & Awards**: Reward system with automatic award calculations
- **📊 Analytics**: View attendance stats, leaderboards, and reports
- **🔄 Cloud Sync Ready**: Optional Supabase integration for multi-device sync
- **🎨 Beautiful UI**: Modern dark theme with smooth animations

## 🚀 Quick Start

**The app works immediately - no setup required!**

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start using the app!

## 📱 What You Can Do

1. **Create Classes** - Add dance classes with custom colors
2. **Add Students** - Manage your dance students
3. **Take Attendance** - Mark attendance during classes
4. **Give Points** - Reward students for good behavior/practice
5. **View Awards** - See automatic award calculations and leaderboards
6. **Track Progress** - Monitor attendance and performance over time

## 🚨 **Multi-Device Note**

**Currently: Single Device Only**
- Each device/browser has its own separate data
- Data is stored locally and doesn't sync between devices
- Perfect for offline use on one device

**Want Multi-Device Sync?**
Follow `SYNC_SETUP_README.md` to add Supabase cloud sync!

## 🔄 Adding Cloud Sync (Optional)

When you're ready for multi-device sync:

1. Set up a [Supabase](https://supabase.com) account
2. Run the database schema from `supabase-schema.sql`
3. Add your credentials to `.env.local`
4. Your data will automatically sync across devices!

See `SYNC_SETUP_README.md` for detailed instructions.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# dance-attendance

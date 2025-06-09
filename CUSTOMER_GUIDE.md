# Customer CRM Interface - Setup & Usage Guide

## 🚀 Quick Start

The Customers section has been completely renovated with a comprehensive CRM interface for managing loyalty program members.

## 🔧 Initial Setup & Migration

### Step 1: Schema Migration (if you have existing data)

If you have existing customer data from the old schema, you'll need to run the migration:

1. **Login to your client account**
2. **Navigate to Customers tab**
3. **Click "Migrate Schema" button** (orange button in the toolbar)
4. **Wait for confirmation** - you'll see a success message showing how many customers were migrated

### Step 2: Create Sample Data (for testing)

If you want to populate the system with sample data for testing:

1. **Open your browser's developer console** (F12)
2. **Go to the Console tab**
3. **Run this command**:
```javascript
// Create sample customers
convex.mutation("customers:createSampleCustomers", {});
```

## 📊 Interface Overview

### Top Metrics Cards
- **Total Customers**: Shows total count with month-over-month growth
- **Cards Installed**: Tracks loyalty card installations
- **Card Transactions**: Monitors customer activity

### Advanced Filtering & Search
- **Search**: Real-time search across names, emails, and phone numbers
- **Sort Options**: Newest, Oldest, Most Loyal, Recently Visited, Card Status, Alphabetical
- **Filters**: Status, Device Type, Card Status, Tags

### Customer Table Features
- **Bulk Selection**: Select multiple customers for bulk actions
- **Profile View**: Click on any customer name to view detailed profile
- **Action Buttons**: View, Edit, Delete for each customer

## 🎯 Key Features

### 1. Customer Management
- ✅ **Create New Customers**: Add customers with loyalty cards
- ✅ **Profile Views**: Detailed customer profiles with metrics
- ✅ **Bulk Operations**: Multi-customer actions
- ✅ **Search & Filter**: Advanced discovery tools

### 2. Loyalty Card System
- ✅ **Multiple Card Types**: Stamp, Points, Membership cards
- ✅ **Installation Tracking**: Monitor card installs and devices
- ✅ **Serial Numbers**: Auto-generated unique identifiers
- ✅ **Install Links**: Generate links for card installation

### 3. Transaction Management
- ✅ **Activity Tracking**: Monitor customer visits and purchases
- ✅ **Points & Stamps**: Track loyalty program progress
- ✅ **Transaction History**: Complete purchase and redemption logs

### 4. Analytics & Insights
- ✅ **Customer Metrics**: Lifetime value, visit frequency, loyalty scores
- ✅ **Growth Tracking**: Month-over-month performance
- ✅ **Tag Management**: Organize customers by categories

## 🛠️ Troubleshooting Common Issues

### Issue: "Customer tab doesn't work"
**Solution**: 
1. Run the schema migration first (see Step 1 above)
2. Check browser console for any JavaScript errors
3. Ensure you have proper permissions for customer management

### Issue: "No customers showing"
**Solutions**:
1. Check if you have the right account selected
2. Clear any active filters
3. Create sample data for testing (see Step 2 above)

### Issue: "Migration button not visible"
**Solution**: 
1. Ensure you're logged in as an account admin
2. Refresh the page and try again
3. Check that you're in the Customers tab

### Issue: TypeScript/Compilation errors
**Solutions**:
1. The old schema used `name` field, new schema uses `firstName` + `lastName`
2. Run the migration to update existing data
3. Any new customers will automatically use the correct schema

## 📋 Customer Profile Features

### Loyalty Overview
- Points/Stamps balance
- Rewards earned and available
- Total visits and lifetime spend
- Referral tracking

### Card Information
- Card type and status
- Installation details
- Device information
- Install and referral links

### Activity Timeline
- Recent visits and purchases
- Reward redemptions
- Referral activity
- Transaction history

## 🎨 UI/UX Features

### Modern Interface
- Clean, responsive design
- Mobile-friendly tables
- Intuitive navigation
- Real-time updates

### Bulk Operations
- Multi-select customers
- Bulk messaging (placeholder)
- Tag management
- Export functionality

### Advanced Search
- Real-time filtering
- Multiple filter categories
- Saved filter states
- Quick actions

## 🔮 Future Enhancements (Placeholders)

The following features are prepared for future development:
- **Import/Export CSV**: Customer data management
- **Bulk Messaging**: Email and SMS campaigns
- **Advanced Analytics**: Customer segmentation and insights
- **Automated Workflows**: Trigger-based actions
- **Reward Management**: Redemption and reward catalog
- **API Integration**: Third-party service connections

## 📞 Support

If you encounter any issues:
1. Check this guide first
2. Run the migration if you haven't already
3. Create sample data to test functionality
4. Check browser console for specific error messages

The customer CRM interface is now a fully-featured system ready for production use! 
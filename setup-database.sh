#!/bin/bash

# Database Setup Script for Sprind Subscription System
# This script will create all the necessary tables and functions in your Supabase database

echo "🚀 Setting up Sprind Subscription Database Schema..."

# Read the schema file and apply it
if [ -f "database-schema-subscription.sql" ]; then
    echo "📋 Found database schema file"
    echo "🔧 To apply this schema:"
    echo ""
    echo "1. Go to your Supabase Dashboard"
    echo "2. Navigate to SQL Editor"
    echo "3. Copy and paste the content from 'database-schema-subscription.sql'"
    echo "4. Run the SQL to create all tables and functions"
    echo ""
    echo "Or use the Supabase CLI:"
    echo "   supabase db push"
    echo ""
    echo "📁 Schema file location: $(pwd)/database-schema-subscription.sql"
else
    echo "❌ database-schema-subscription.sql not found!"
    exit 1
fi

echo ""
echo "✅ After running the schema, your database will have:"
echo "   - user_subscriptions table"
echo "   - subscription_events table" 
echo "   - topic_access_rules table"
echo "   - user_access_log table"
echo "   - check_user_premium_access() function"
echo "   - check_topic_access() function"
echo "   - log_topic_access() function"
echo ""
echo "🎯 Then you can test the subscription system!"
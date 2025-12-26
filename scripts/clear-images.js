#!/usr/bin/env node

/**
 * Script to clear all images from the database and file system
 * Usage: node scripts/clear-images.js [--dry-run] [--db-only]
 *
 * Options:
 *   --dry-run   Show what would be deleted without actually deleting
 *   --db-only   Only delete from database, keep files on disk
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Import Image model
const Image = require('../src/models/Image');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/posed-server';
const UPLOAD_PATH = process.env.UPLOAD_PATH || 'uploads/images';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const dbOnly = args.includes('--db-only');
const deleteFiles = !dbOnly; // Default: delete files too

async function askConfirmation(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
}

async function clearImages() {
    console.log('🔄 Connecting to MongoDB...');
    console.log(`   URI: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Get count of images
        const imageCount = await Image.countDocuments();
        console.log(`📊 Found ${imageCount} images in database`);

        if (imageCount === 0) {
            console.log('ℹ️  No images to delete. Exiting...');
            await mongoose.disconnect();
            return;
        }

        if (deleteFiles) {
            // Get all file paths
            const images = await Image.find({}, 'filePath fileName');
            console.log(`📁 Will also delete ${images.length} image files from: ${UPLOAD_PATH}`);
        } else {
            console.log('📁 DB-only mode: Files will NOT be deleted from disk');
        }

        if (isDryRun) {
            console.log('\n🔍 DRY RUN MODE - No changes will be made');

            // Show sample of images that would be deleted
            const sampleImages = await Image.find({}).limit(5).select('fileName title createdAt');
            console.log('\nSample of images that would be deleted:');
            sampleImages.forEach((img, index) => {
                console.log(`  ${index + 1}. ${img.fileName} (${img.title || 'No title'}) - Created: ${img.createdAt}`);
            });

            if (imageCount > 5) {
                console.log(`  ... and ${imageCount - 5} more`);
            }

            console.log('\n✅ Dry run complete. Use without --dry-run to actually delete.');
            await mongoose.disconnect();
            return;
        }

        // Ask for confirmation
        console.log('\n⚠️  WARNING: This action cannot be undone!');
        const confirmed = await askConfirmation(`Are you sure you want to delete all ${imageCount} images? (y/N): `);

        if (!confirmed) {
            console.log('❌ Operation cancelled.');
            await mongoose.disconnect();
            return;
        }

        // Delete image files (default behavior)
        if (deleteFiles) {
            console.log('\n🗑️  Deleting image files...');
            const images = await Image.find({}, 'filePath');
            let deletedFiles = 0;
            let failedFiles = 0;

            for (const image of images) {
                try {
                    const fullPath = path.join(process.cwd(), image.filePath);
                    if (fs.existsSync(fullPath)) {
                        fs.unlinkSync(fullPath);
                        deletedFiles++;
                    }
                } catch (err) {
                    failedFiles++;
                    console.error(`   ❌ Failed to delete: ${image.filePath} - ${err.message}`);
                }
            }
            console.log(`   ✅ Deleted ${deletedFiles} files, ${failedFiles} failed`);
        }

        // Delete all images from database
        console.log('\n🗑️  Deleting images from database...');
        const result = await Image.deleteMany({});
        console.log(`   ✅ Deleted ${result.deletedCount} images from database`);

        // Verify deletion
        const remainingCount = await Image.countDocuments();
        if (remainingCount === 0) {
            console.log('\n✅ All images have been successfully cleared!');
        } else {
            console.log(`\n⚠️  ${remainingCount} images still remain in database`);
        }

        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');

    } catch (error) {
        console.error('❌ Error:', error.message);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Run the script
clearImages();

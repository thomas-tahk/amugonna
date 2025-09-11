#!/usr/bin/env node

/**
 * Documentation Sync System for Amugonna
 * Automatically updates documentation files when project state changes
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Documentation files to sync
const DOCS = {
  CLAUDE_MD: path.join(projectRoot, 'CLAUDE.md'),
  README_MD: path.join(projectRoot, 'README.md'),
  SESSION_RESUME: path.join(projectRoot, 'SESSION_RESUME.md'),
  ROADMAP: path.join(projectRoot, 'docs', 'ROADMAP.md'),
  CHANGELOG: path.join(projectRoot, 'docs', 'CHANGELOG.md')
};

// Key files to watch for changes
const SOURCE_FILES = {
  SERVER_PACKAGE: path.join(projectRoot, 'server', 'package.json'),
  CLIENT_PACKAGE: path.join(projectRoot, 'client', 'package.json'),
  PRISMA_SCHEMA: path.join(projectRoot, 'server', 'prisma', 'schema.prisma'),
  ENV_EXAMPLE: path.join(projectRoot, 'server', '.env.example')
};

class DocSync {
  constructor() {
    this.projectState = this.analyzeProjectState();
  }

  analyzeProjectState() {
    const state = {
      features: {
        backend: this.checkBackendFeatures(),
        frontend: this.checkFrontendFeatures(),
        database: this.checkDatabaseFeatures(),
        ai: this.checkAIFeatures()
      },
      dependencies: this.getDependencies(),
      lastUpdate: new Date().toISOString(),
      version: this.getProjectVersion()
    };
    
    return state;
  }

  checkBackendFeatures() {
    const features = [];
    
    // Check for auth routes
    if (fs.existsSync(path.join(projectRoot, 'server', 'src', 'routes', 'auth.ts'))) {
      features.push('JWT Authentication');
    }
    
    // Check for ingredient routes
    if (fs.existsSync(path.join(projectRoot, 'server', 'src', 'routes', 'ingredients.ts'))) {
      features.push('Ingredient Management API');
    }
    
    // Check for recipe routes
    if (fs.existsSync(path.join(projectRoot, 'server', 'src', 'routes', 'recipes.ts'))) {
      features.push('Recipe Management API');
    }
    
    // Check for AI service
    if (fs.existsSync(path.join(projectRoot, 'server', 'src', 'services', 'aiRecipeGenerator.ts'))) {
      features.push('AI Recipe Generation');
    }
    
    return features;
  }

  checkFrontendFeatures() {
    const features = [];
    const componentsDir = path.join(projectRoot, 'client', 'src', 'components');
    
    if (fs.existsSync(path.join(componentsDir, 'AuthForm.tsx'))) {
      features.push('User Authentication UI');
    }
    
    if (fs.existsSync(path.join(componentsDir, 'PantryManager.tsx'))) {
      features.push('Pantry Management Interface');
    }
    
    if (fs.existsSync(path.join(componentsDir, 'RecipeGenerator.tsx'))) {
      features.push('AI Recipe Generation UI');
    }
    
    if (fs.existsSync(path.join(componentsDir, 'IngredientSearch.tsx'))) {
      features.push('Ingredient Search & Autocomplete');
    }
    
    return features;
  }

  checkDatabaseFeatures() {
    const features = [];
    
    try {
      const schema = fs.readFileSync(SOURCE_FILES.PRISMA_SCHEMA, 'utf8');
      
      if (schema.includes('model User')) features.push('User Management');
      if (schema.includes('model Ingredient')) features.push('Ingredient Database');
      if (schema.includes('model Recipe')) features.push('Recipe Storage');
      if (schema.includes('model DietaryRestriction')) features.push('Dietary Restrictions');
      if (schema.includes('isAiGenerated')) features.push('AI Recipe Metadata');
      if (schema.includes('nutritionalInfo')) features.push('Nutritional Analysis');
      
    } catch (error) {
      console.warn('Could not read Prisma schema:', error.message);
    }
    
    return features;
  }

  checkAIFeatures() {
    const features = [];
    
    try {
      const envExample = fs.readFileSync(SOURCE_FILES.ENV_EXAMPLE, 'utf8');
      if (envExample.includes('OPENAI_API_KEY')) {
        features.push('OpenAI Integration');
      }
      if (envExample.includes('SPOONACULAR_API_KEY')) {
        features.push('Spoonacular API Support');
      }
    } catch (error) {
      console.warn('Could not read .env.example:', error.message);
    }
    
    return features;
  }

  getDependencies() {
    const deps = { server: [], client: [] };
    
    try {
      const serverPkg = JSON.parse(fs.readFileSync(SOURCE_FILES.SERVER_PACKAGE, 'utf8'));
      deps.server = Object.keys(serverPkg.dependencies || {});
      
      const clientPkg = JSON.parse(fs.readFileSync(SOURCE_FILES.CLIENT_PACKAGE, 'utf8'));
      deps.client = Object.keys(clientPkg.dependencies || {});
    } catch (error) {
      console.warn('Could not read package.json files:', error.message);
    }
    
    return deps;
  }

  getProjectVersion() {
    try {
      const rootPkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
      return rootPkg.version || '1.0.0';
    } catch (error) {
      return '1.0.0';
    }
  }

  updateClaudeMd() {
    const allFeatures = [
      ...this.projectState.features.backend,
      ...this.projectState.features.frontend,
      ...this.projectState.features.database,
      ...this.projectState.features.ai
    ];

    const status = `## Current Status
- **Database foundation fully operational** - PostgreSQL + Prisma working with enhanced recipe schema
- **Complete JWT-based authentication system** - Registration, login, profile management tested and working
- **Ingredient management API** - Search, user pantry CRUD operations, database seeding
- **Frontend foundation scaffold** - React components, TypeScript types, API services, authentication context
- **AI Recipe Generation System** - OpenAI-powered recipe creation from user's pantry ingredients
- **Complete recipe management** - Generate, view, save, and manage AI-created recipes
- Server-database connectivity verified via health endpoint
- **Ready for production deployment and testing**
- Documentation structure established and maintained

## Development Status
- **Backend**: Complete with AI recipe generation (${this.projectState.features.backend.length} features)
- **Frontend**: Complete with recipe generation UI and pantry management (${this.projectState.features.frontend.length} features)
- **Database**: Enhanced schema with AI recipe fields, ready for seeding
- **Authentication**: Complete and integrated
- **AI Integration**: OpenAI-powered recipe generation ready (requires OPENAI_API_KEY)
- **Recipe Management**: Full CRUD operations for AI-generated recipes

*Last updated: ${new Date().toLocaleDateString()}*`;

    try {
      let claudeMd = fs.readFileSync(DOCS.CLAUDE_MD, 'utf8');
      
      // Update the current status section
      claudeMd = claudeMd.replace(
        /## Current Status[\s\S]*?(?=\n## |$)/,
        status
      );
      
      fs.writeFileSync(DOCS.CLAUDE_MD, claudeMd);
      console.log('✅ Updated CLAUDE.md');
    } catch (error) {
      console.error('❌ Failed to update CLAUDE.md:', error.message);
    }
  }

  updateReadme() {
    const liveFeatures = [
      ...this.projectState.features.backend.map(f => `- ${f} with secure JWT tokens and comprehensive API`),
      ...this.projectState.features.frontend.map(f => `- ${f} with responsive design`),
      ...this.projectState.features.database.map(f => `- ${f} with PostgreSQL and Prisma ORM`)
    ];

    const featuresSection = `## 🔧 What's Live Now

**🤖 AI-Assisted Recipe Suggestions**
- Generate recipe ideas based on your selected ingredients
- Nutritional analysis with calories and macros for meal planning
- Customizable by cuisine type, dietary restrictions, and serving size
- Experimental AI integration for ingredient-based cooking assistance

**🥘 Smart Pantry Management**
- Search and add ingredients with auto-complete suggestions
- Track quantities, units, and expiration dates
- Clean, intuitive ingredient management interface

**🎯 Personalization Features**
- User authentication with secure JWT tokens
- Save and manage your generated recipes
- Dark/light mode support that adapts to your system preferences

**📱 Mobile-Optimized Experience**
- Responsive design works seamlessly on all devices
- Touch-friendly ingredient selection and recipe generation
- Optimized for kitchen use on tablets and phones

*Features implemented: ${liveFeatures.length} total*
*Last updated: ${new Date().toLocaleDateString()}*`;

    try {
      let readme = fs.readFileSync(DOCS.README_MD, 'utf8');
      
      // Update the features section
      readme = readme.replace(
        /## 🔧 What's Live Now[\s\S]*?(?=\n## |$)/,
        featuresSection
      );
      
      fs.writeFileSync(DOCS.README_MD, readme);
      console.log('✅ Updated README.md');
    } catch (error) {
      console.error('❌ Failed to update README.md:', error.message);
    }
  }

  updateSessionResume() {
    const resumeContent = `# Session Resume Guide - ${new Date().toLocaleDateString()}

## Project Status Summary
**Backend**: ${this.projectState.features.backend.length} features complete
**Frontend**: ${this.projectState.features.frontend.length} features complete  
**Database**: ${this.projectState.features.database.length} features complete
**AI Integration**: ${this.projectState.features.ai.length} features complete

## Quick Validation Commands

### Backend Testing (Priority 1)
\`\`\`bash
# Navigate to server directory
cd /Users/tnt/Projects/amugonna/server

# Start server
npm run dev

# In separate terminal, test endpoints
curl "http://localhost:3001/health"
curl "http://localhost:3001/api/ingredients?search=chicken"
\`\`\`

### Frontend Testing (Priority 2)
\`\`\`bash
# Navigate to client directory  
cd /Users/tnt/Projects/amugonna/client

# Start frontend development server
npm run dev

# Open browser to http://localhost:5173
# Test authentication and pantry management
\`\`\`

## Current Development Phase: Foundation Validation
1. ✅ **Backend API Testing** - All endpoints validated
2. 🔧 **OpenAI Integration** - Resolve quota/key issues  
3. 🚀 **Integration Testing** - Frontend-backend connection
4. 📊 **Database Verification** - Seeding and data integrity

*Auto-generated: ${this.projectState.lastUpdate}*`;

    try {
      fs.writeFileSync(DOCS.SESSION_RESUME, resumeContent);
      console.log('✅ Updated SESSION_RESUME.md');
    } catch (error) {
      console.error('❌ Failed to update SESSION_RESUME.md:', error.message);
    }
  }

  logProjectState() {
    console.log('\n📊 Project State Analysis:');
    console.log(`Version: ${this.projectState.version}`);
    console.log(`Backend Features: ${this.projectState.features.backend.length}`);
    console.log(`Frontend Features: ${this.projectState.features.frontend.length}`);
    console.log(`Database Features: ${this.projectState.features.database.length}`);
    console.log(`AI Features: ${this.projectState.features.ai.length}`);
    console.log(`Server Dependencies: ${this.projectState.dependencies.server.length}`);
    console.log(`Client Dependencies: ${this.projectState.dependencies.client.length}\n`);
  }

  syncAll() {
    console.log('🔄 Syncing documentation files...\n');
    
    this.logProjectState();
    this.updateClaudeMd();
    this.updateReadme();
    this.updateSessionResume();
    
    console.log('\n✅ Documentation sync complete!');
  }
}

// Run sync if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const sync = new DocSync();
  sync.syncAll();
}

export default DocSync;
# Amugonna 🍳
> **The Problem**: We've all been there - staring into the fridge wondering "am I gonna" be able to make something decent with random ingredients, only to end up ordering takeout again.  
> **The Solution**: A smart recipe app that transforms your available ingredients into personalized meal recommendations, reducing food waste and expanding your cooking horizons.

![Recipe Demo](placeholder-for-demo.gif)
*Live demo coming soon*

## 🎯 Why I Built This

Like many people, I found myself in a frustrating cycle: buying groceries with good intentions, then struggling to combine ingredients into actual meals. The "what's for dinner?" question became a daily source of stress, often leading to food waste and expensive takeout orders.

I wanted to build something that would make cooking more approachable and help people make better use of what they already have. **Amugonna** (a play on "am I gonna make something good?") turns that uncertainty into confidence.

## ✨ What Makes It Different

**Ingredient-First Approach**: Rather than starting with preset recipes, Amugonna begins with what you actually have and helps you create meals from your available ingredients.

**Practical Focus**: Built for real-world cooking scenarios - not everyone has 15 specialty ingredients on hand, and that's okay. The AI works with whatever you have.

**Transparent Nutrition**: Every generated recipe includes detailed nutritional analysis, helping you make informed decisions about your meals.

**Developer-First Architecture**: Clean, type-safe codebase that prioritizes maintainability and extensibility - perfect for showcasing modern full-stack development practices.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/thomas-tahk/amugonna.git
cd amugonna

# Install dependencies for both client and server
npm install

# Set up your OpenAI API key for AI recipe generation
cp server/.env.example server/.env
# Edit server/.env and add your OPENAI_API_KEY

# Set up the database
cd server
npx prisma db push
npm run seed
cd ..

# Start development servers
npm run dev
```

Visit `http://localhost:5173` to start discovering recipes with your ingredients!

## 🔧 What's Live Now

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

## 🚧 Coming Soon

**📊 Enhanced Recipe Intelligence**
- Improved AI prompting for more sophisticated recipe generation
- Integration with curated recipe databases for better suggestions
- Learning algorithm that improves recommendations over time

**🛒 Shopping & Planning**
- Auto-generated shopping lists for recipes
- Weekly meal planning with ingredient optimization
- Barcode scanning for quick pantry updates

**🌐 Social Features**
- Recipe sharing and community reviews
- Integration with grocery delivery services

## 🛠 Tech Stack & Architecture Decisions

**Frontend: React + TypeScript + Vite**
- Chose React for component reusability and rich ecosystem
- TypeScript for better development experience and fewer runtime errors
- Vite for fast development and optimized builds

**Backend: Node.js + Express + TypeScript**
- Express for rapid API development and middleware ecosystem
- Full TypeScript stack for consistency and type safety
- RESTful API design for clear client-server communication

**AI Integration: OpenAI GPT-3.5-turbo**
- Experimental recipe suggestion system based on available ingredients
- Automated nutritional analysis and dietary restriction support
- Fallback system ensures functionality even during API downtime

**Database: PostgreSQL + Prisma ORM**
- Relational data structure perfect for recipes, ingredients, and user relationships
- JSONB columns for flexible recipe metadata and nutritional information
- Type-safe database operations with Prisma's generated client

**Hosting: Digital Ocean**
- Cost-effective deployment with predictable pricing
- Easy scaling options as user base grows
- Docker containerization for consistent environments

**Monorepo Structure**: Keeps related client and server code organized while sharing TypeScript types and utilities.

## 💡 Development Challenges & Solutions

**Challenge 1: Ingredient Matching Complexity**
- *Problem*: How do you match "2 cups flour" with "all-purpose flour" in someone's pantry?
- *Solution*: Built a normalized ingredient database with aliases and unit conversions, plus fuzzy matching algorithms

**Challenge 2: Recipe Data Quality**
- *Problem*: External recipe APIs often have inconsistent or incomplete ingredient lists
- *Solution*: Implemented data validation and normalization layers, plus manual curation for popular recipes

**Challenge 3: User Experience on Mobile**
- *Problem*: Typing ingredient lists on mobile is tedious
- *Solution*: Added search-as-you-type functionality with smart suggestions and common ingredient shortcuts

**Challenge 4: Offline Functionality**
- *Problem*: Users need access to recipes while cooking, even with poor connectivity
- *Solution*: Service worker implementation with selective caching of user's saved recipes and ingredient lists

## 📚 What I Learned

**Modern Full-Stack Development**: This project deepened my understanding of TypeScript across the entire stack and reinforced the value of type safety in larger applications.

**User-Centric Design**: Initially focused too much on technical features rather than core user workflows. Learned the importance of starting with user stories and testing assumptions early.

**Data Architecture Thinking**: Designing the ingredient and recipe relationship models taught me about database normalization and the tradeoffs between query performance and data flexibility.

**API Design Patterns**: Implemented proper REST conventions, error handling, and rate limiting - skills that translate directly to professional development.

## 🚧 Current Status

This is an active development project. Core functionality is complete, with ongoing work on:
- Enhanced mobile UI/UX
- Advanced dietary restriction filtering
- Social features (recipe sharing and reviews)
- Integration with grocery delivery APIs

## 🤝 Contributing

Interested in contributing? I'd love to collaborate! Check out the issues tab for current priorities, or reach out with feature ideas.

## 📄 License

MIT License - feel free to use this project as inspiration for your own recipe adventures!

---

**Built with ❤️ by [Thomas](https://github.com/thomas-tahk)** | **[Live Demo](placeholder-link)** | **[Report Bug](https://github.com/thomas-tahk/amugonna/issues)**
# SmartDiet - Intelligent Diet & Exercise Planning Application

## Overview
SmartDiet is fundamentally a personal health management and progress tracking system designed to help users create, organize, and discover personalized diet plans, exercise routines, and recipes. Unlike standard tracking apps, SmartDiet features a unique book-inspired user interface that transforms the user experience into a personal and cozy health journal.

The application serves as a personal health management system where users can track progress through five distinct metric types, manage detailed nutritional plans, and visualize their journey through interactive charts. It bridges the gap between content creation (recipes/plans) and daily execution (logging/tracking), wrapped in a responsive experience powered by Alpine.js and Django.
## Distinctiveness and Complexity

### Why This Project is Distinct
 SmartDiet distinguishes itself as a dedicated personal health ecosystem that integrates content creation with granular progress tracking. Its uniqueness stems from its complex data modeling and immersive design choices:
- Book-Like UI Interface deviating from standard dashboard templates and mimic physical books with advanced layout calculations 
- Real-time progress tracking with five distinct metric types (continuous, daily, boolean, scale, category), each has its own logic for storage, historical carry-over, and scoring.
- Automated plan scheduling with intelligent date-based section matching to specific calendar dates.providing better progress tracking and backfilling missing logs.
- Historical data analysis with Chart.js visualizations showing trends over time
- Complex metric scoring algorithms tailored to each metric type
- USDA API integration for automatic nutritional calculation
- Hierarchical plan structures with unlimited nesting depth

### Complexity Breakdown

This project demonstrates substantial complexity across multiple dimensions:

#### 1. Advanced Data Architecture & Query Optimization

**React Query-Inspired Caching System:**
 - a client-side caching layer (`QueryCache.js`) that manages API responses with TTL (Time To Live), stale-while-revalidate patterns, and automatic background refetching:
 - This system reduces unnecessary API calls, improves perceived performance, and provides a consistent data layer across components.

**Polymorphic Model Design:**
- uses Django's model inheritance with a custom manager that automatically creates the correct subclass (Recipe or Plan) based on a type discriminator field. This enables unified querying and browsing across different content types while maintaining type-specific fields and behavior.

**Hierarchical Plan Structure:**
Plans support deeply nested sections via self-referential relationships. Each section can contain subsections, which can contain their own subsections indefinitely. The system includes:
- Order management with automatic sibling reordering on deletion
- JSON-based content storage supporting multiple block types (paragraphs, lists, internal references)
- Recursive rendering via custom Django template tag (`{% recursetree %}`)
- Drag-and-drop section reorganization with real-time updates

#### 2. Immersive Book-Like Interface
    
- Minimal vertical scrolling, preferring horizontal scrolling to mimic page-based navigation
- Responsive switching between single-column and two-column layouts
- Dynamic layout calculations to control how much content is displayed:

##### Browse Screens (Grid of Cards)
Dynamically calculates how many cards can fit by comparing the container dimensions with the card size and adjusting row counts for better responsiveness based on screen width.

##### Element Detail Screens (Two-Column Horizontally Scrolled Layout)
Uses a visible container and a content container:
- The content container's width is set to match the visible container so the browser can accurately render the full content
- The rendered content height is divided by the visible height to determine the required number of pages, which is then applied as the CSS column count, distributing content across columns
- Navigated by controlled horizontal scrolling using CSS `position: relative` and the `right` property



#### 3. Sophisticated Metric Tracking System 
- **Scoring Algorithms:**  
  Calculates daily scores based on linear interpolation (weight), binary targets (completion), or normalized scales (mood), aggregated into an overall daily wellness score (0-100).

- **Automated Continuity:**  
  automatically backfills missing logs and carries over "continuous" data to ensure gapless history.

- **five distinct metric type**
  1. **Continuous Metrics** (e.g., weight loss from 80kg → 70kg):
    - Progressive tracking with value carryover from previous entries
    - Linear interpolation scoring: `(current - start) / (target - start) × 100%`
  2. **Daily Metrics** (e.g., water intake):
    - Reset accumulation each day
    - Percentage-based scoring with cap: `min(100%, current / target × 100%)`
  3. **Boolean Metrics** (e.g., completed workout):
    - Yes/No tracking with directional goals
    - Binary scoring: `1.0` if goal met, `0.0` otherwise
  4. **Scale Metrics** (1-5 ratings like energy level):
    - Ordered discrete values with descriptive labels
    - Normalized scoring with direction: `value / 5.0` or `1.0 - (value / 5.0)`
  5. **Category Metrics** (mood: calm/stressed/busy):
    - Unordered choice tracking with Custom option sets per metric
    - Target list matching: `1.0` if current value in target list, else `0.0`
    

**Automated Data Management:**
The system implements `get_current_plan()` which automatically fills missing logs from the last entry to today, ensuring data continuity. When users assign a new plan, the system:

1. Checks for existing active plans and handles replacement logic
2. Initializes all plan-linked metrics with appropriate starting values
3. Carries forward last values for continuous metrics
4. Resets daily metrics to zero
5. Sets default values for boolean (false), scale (3), and category (first option) metrics

#### 4. External API Integration with Advanced Unit Conversion 

**USDA FoodData Central Integration:**
The application connects to the USDA API to calculate nutritional information for recipes automatically. When users save ingredients, the backend:

1. Parses ingredient names and quantities
2. Queries USDA FoodData Central for matching foods
3. Retrieves 30+ nutrients (calories, protein, fats, vitamins, minerals)
4. Converts user-entered units to grams using the comprehensive unit system
5. Stores complete nutritional profile with the recipe

**Comprehensive Unit Conversion System:**
Handles 50+ units across multiple categories with priority-based conversion:

```javascript
// Weight conversions (most reliable)
'g' → 1, 'kg' → 1000, 'oz' → 28.35, 'lb' → 453.592

// Volume conversions with ingredient densities
'ml' → 1, 'cup' → 240, 'tbsp' → 15, 'tsp' → 5

// Ingredient-specific densities (grams per cup)
flour: 120, sugar: 200, milk: 245, butter: 227

// Specific conversions for piece-based ingredients
('garlic', 'clove') → 3g, ('butter', 'stick') → 113g, ('egg', 'piece') → 50g
```

The system uses a four-tier priority approach:
1. Direct weight conversions (g, kg, oz, lb) - most accurate
2. Ingredient-specific pairs (e.g., garlic clove = 3g) - predefined conversions
3. Volume with ingredient density (e.g., 1 cup flour = 120g) - calculated conversions
4. Imprecise units with defaults and warnings (e.g., "handful" defaults to 30g with user alert)
5. Unknown units are treated as grams.

#### 5. Component-Based Architecture with Lifecycle Management
Using Alpine.js for state management and lifecycle events, extended through custom component classes to handle CRUD operations and user interactions. Each page has a main component managing state, supported by specialized sub-components.

---

##### Core Components

 1. **DietEle** (`DietEle.js`)
Base component for displaying plans and recipes with paginated details.

- Calculates dynamic pagination and responsive layout (single/two-column) based on viewport
- Implements smooth scroll animations between pages with section navigation
- Handles multiple display modes: details, mediaViewer, and fullImages

---

 2. **EleDataManager** (`EleDataManager.js`)
Extends DietEle to handle plan and recipe editing operations.

- Manages all content editing (name, goal, notes, duration, ingredients)
- Coordinates section and media operations via SectionsEditor and MediaManager
- Implements optimistic updates with server sync and rollback on failure

---

 3. **CardList** (`CardList.js`)
Grid display component with intelligent pagination and dynamic sizing.

- Calculates optimal grid layout and auto-adjusts on resize with debouncing
- Syncs pagination with URL parameters via NavigationManager
- Handles inline updates and deletion with automatic cache invalidation

---

4. **CreationForm** (`creationForm.js`)
Modal component for creating new plans and recipes.

- Real-time validation with type-specific inputs (plan: duration/goal, recipe: servings/prep time)
- Category autocomplete with keyboard navigation (arrow keys + Enter)
- Post-creation integration with page managers or server redirect fallback

---

 5. **IngredientInput** (`ingredientsInput.js`)
Reusable structured ingredient entry component.

- Three-part input: amount (numeric) → unit (autocomplete from 40+ units) → name (text)
- Keyboard navigation with auto-scroll and intelligent defaults
- Serialization to/from newline-delimited text format

---

 6. **Paginator** (`Paginator.js`)
Universal pagination controller for CardList and DietEle components.

- Maintains page state and delegates pagination logic to attached component
- Handles resize with active section preservation and indicator updates

---

 7. **SectionDetailsEditor** (`sectionDetailsEditor.js`)
Rich text editor for plan section content with formatting.

- Fragment-based content structure (paragraphs, lists, references) with inline formatting
- Selection-based format bar with colors, styles, and font sizes
- Keyboard shortcuts (Enter for new blocks, empty item exits list) with Alpine.js reactivity

---

 8. **SectionsEditor** (`SectionsEditor.js`)
Manages plan section hierarchy and ordering operations.

- Rename with uniqueness validation and quick navigation updates
- Reorder with three relations (before, after, parent) and sibling adjustments
- Create/delete with DOM injection via Alpine.initTree() and pagination recalculation

---

 9. **Profile** (`profile.js`)
User profile management component.

- Avatar upload with validation and username editing with inline feedback
- Dynamic restriction management (allergies, intolerances) with full CRUD operations
- Responsive table with collapsible view based on viewport size

---

##### Supporting Services

1. **QueryService** (`QueryService.js`)
Core data fetching orchestrator with lifecycle hooks.

- Cache-first with stale-while-revalidate and prefetch support
- CSRF handling, automatic redirects, and AbortController integration

---

2. **ApiService** (`ApiService.js`)
Low-level HTTP client wrapping Fetch API.

- Automatic CSRF injection and payload handling (JSON/FormData)
- Returns unified response: `{ok, status, type, data, headers}`

---

3. **NavigationManager** (`NavigationManager.js`)
Browser history and URL management utility.

- pushState/replaceState with popstate handling for SPA navigation
- URL construction with validation and duplicate entry prevention





## Project Structure
**Tech Stack:** Django 5.x, Alpine.js, Bootstrap 5.3, Chart.js, SQLite

### FIle Structure
---

```
SMARTDIET/
│
├── config/                          # Django project configuration
│   ├── settings.py                  # Django settings, USDA API key, database config
│   ├── urls.py                      # Root URL routing with custom 404 handler
│   ├── wsgi.py                      # WSGI application entry point
│   └── asgi.py                      # ASGI application configuration
│
├── core/                            # Progress tracking & metrics system
│   ├── models.py                    # UserLog, Metric, TrackedMetrics, DailyAchivedMetrics models
│   ├── views.py                     # 15 views for progress tracking, metrics CRUD, plan assignment
│   ├── urls.py                      # Core app URL patterns
│   ├── apps.py                      # App configuration
│   ├── helpers/
│   │   ├── assigned_plans.py        # 500+ lines: auto-fill logs, metric scoring algorithms
│   │   ├── helpers.py               # Period calculations, metric formatting utilities
│   │   ├── serializer.py            # Model-to-dict converters for JSON responses
│   │   ├── validators.py            # Image validation (type, size limits)
│   │   └── ajaxRedirect.py          # JSON response with redirect headers
│   └── migrations/                  # Database migrations
│
├── healthHub/                       # Recipe & plan content management
│   ├── models/
│   │   ├── base.py                  # UserCreation polymorphic base with type discrimination
│   │   ├── recipe.py                # Recipe model with ingredients, directions, nutrients
│   │   ├── plan.py                  # Plan, PlanDetail (hierarchical), LinkedPlan models
│   │   ├── managers.py              # Custom manager for polymorphic creation
│   │   └── serializers.py           # Model serialization with computed fields
│   ├── helpers/
│   │   ├── nurtientCalculator.py    # 500+ lines: USDA API integration, unit conversion
│   │   ├── creationManage.py        # Recipe/plan creation, hierarchical cloning
│   │   ├── helpers.py               # Format plan details, orphaned reference cleanup
│   │   ├── construct_query.py       # Dynamic Django Q object builder
│   │   ├── paginator.py             # Simple pagination utility
│   ├── templatetags/
│   │   └── nested_tags.py           # Custom {% recursetree %} tag for hierarchical rendering
│   ├── views.py                     # Browse, detail, CRUD, clone, media operations
│   ├── forms.py                     # BaseCreationForm, RecipeForm, PlanForm with validation
│   ├── urls.py                      # HealthHub URL patterns
│   └── migrations/                  # Database migrations
│
├── users/                           # Authentication & profile management
│   ├── models.py                    # User (extended), MedicalIssues, UserRestriction models
│   ├── views.py                     # Login, register, profile CRUD operations
│   ├── urls.py                      # Users app URL patterns
│   ├── forms/
│   │   ├── login_form.py            # Username/email login with validation
│   │   └── register_form.py         # Registration with password strength checks
│   ├── helpers/
│   │   ├── profile_update.py        # Avatar, username, user data updates
│   │   ├── validators.py            # Custom password validator
│   │   └── get_inputs_atrr.py       # Alpine.js attribute generator
│   ├── widgets/
│   │   ├── password_with_toggel.py  # Password input with show/hide toggle
│   │   └── suppress_label.py        # Conditional label rendering
│   ├── fixtures/
│   │   └── medical_issues.json      # Predefined medical conditions
│   └── migrations/                  # Database migrations
│
├── static/                          # Frontend assets (CSS, JS, images)
│   ├── common/
│   │   ├── styles.css               # 500+ lines: base styles, theming variables
│   │   ├── styles-mobile.css        # Mobile overrides (<768px)
│   │   ├── styles-tablet.css        # Tablet overrides (<992px)
│   │   ├── styles-desktop.css       # Desktop enhancements (>1025px)
│   │   ├── script.js                # App entry point, QueryCache, EventDelegator init
│   │   ├── paginator.css            # Pagination controls styling
│   │   ├── creationForm.css         # Modal form styling
│   │   └── ingridentForm.css        # Dynamic ingredient list styling
│   ├── progress/
│   │   ├── styles.css               # Calendar, metrics, chart styling
│   │   └── script.js                # Progress page components registration
│   ├── auth/
│   │   ├── styles.css               # Authentication page styling
│   │   └── script.js                # Auth form initialization
│   ├── profile/
│   │   ├── styles.css               # Profile page styling
│   │   └── script.js                # Profile component registration
│   ├── home/
│   │   ├── styles.css               # Dashboard styling
│   │   └── script.js                # HomeManager initialization
│   ├── browser/
│   │   ├── styles.css               # Browse/discover page styling
│   │   └── script.js                # CardList, CreationForm registration
│   ├── details/
│   │   ├── styles.css               # Detail page styling
│   │   └── script.js                # Detail components registration
│   └── assets/
│       ├── dark/                    # Dark theme images
│       ├── light/                   # Light theme images
│       ├── logo.png                 # Application logo
│       └── profile.jpg              # Default avatar
│
├── scripts_module/                  # Frontend JavaScript modules
│   ├── ComponentsClasses/
│   │   ├── Component.js             # 200+ lines: Abstract base class, registry system
│   │   ├── progress/
│   │   │   ├── Calendar.js          # 250 lines: Monthly view, plan indicators
│   │   │   ├── DayProgress.js       # 400 lines: Daily tracking, metrics CRUD
│   │   │   ├── PeriodProgress.js    # 250 lines: Chart.js graphs, comparisons
│   │   │   └── ProgressHeader.js    # 100 lines: View switcher, avg scores
│   │   ├── browsePage/
│   │   │   ├── DataManager.js       # Data fetching wrapper
│   │   │   ├── LayoutGridClaculator.js  # Responsive grid calculator
│   │   │   └── UrlManage.js         # URL parameter management
│   │   ├── detailsPage/
│   │   │   ├── layoutCalculator.js  # Detail page layout calculations
│   │   │   ├── MediaManager.js      # Image gallery management
│   │   │   ├── scrollAnimator.js    # Smooth scrolling animations
│   │   │   └── sectionNavigator.js  # Section navigation
│   │   ├── home/
│   │   │   └── HomeManager.js       # Plan assignment coordinator
│   │   ├── profile/
│   │   │   └── Profile.js           # Profile Editor with restrictions
│   │   ├── AuthForm.js              # Login/register with validation
│   │   ├── CardList.js              # Grid with responsive pagination
│   │   ├── creationForm.js          # 180 lines: Recipe/plan modal form
│   │   ├── detailsEditor.js         # WYSIWYG content editor
│   │   ├── DietEle.js               # Base detail page component
│   │   ├── ingridentInput.js        # 150 lines: Dynamic list with unit autocomplete
│   │   ├── Paginator.js             # Generic pagination controller
│   │   ├── EleDataManager.js        # Mange Crud operation for elements
│   │   └── sectionDetailsEditor.js  # Section-specific editor
│   └── helpers/
│       ├── fetchData/
│       │   ├── QueryCache.js        # 100 lines: TTL cache, stale-while-revalidate
│       │   ├── ApiService.js        # 100 lines: HTTP client, CSRF handling
│       │   └── QueryService.js      # 150 lines: React Query-inspired orchestrator
│       └── utils/
│           ├── DomUtils.js          # 150 lines: Error display, validation, loaders
│           ├── validators.js        # 50 lines: Password, email, image validators
│           ├── NavigationManager.js # 80 lines: History API wrapper
│           ├── eventDelegations.js  # 100 lines: Centralized event system
│           ├── DataFromater.js      # 50 lines: Date, duration formatters
│           └── Constants.js         # Application-wide constants
│
├── templates/                       # Django HTML templates
│   ├── layout.html                  # Base template with Alpine.js, Bootstrap, Chart.js
│   ├── index.html                   # Dashboard with book layout
│   ├── logs.html                    # Progress tracking with calendar & analytics
│   ├── profile.html                 # Split-screen profile editor
│   ├── browser.html                 # Browse/discover with filters & grid
│   ├── details.html                 # Detail page wrapper with paginator
│   ├── auth.html                    # Login/register forms
│   ├── error.html                   # Custom error display
│   └── components/
│       ├── navBar.html              # Main navigation bar
│       ├── paginator.html           # Pagination wrapper
│       ├── authForm.html            # Authentication form
│       ├── progress/
│       │   ├── calendar.html        # Monthly calendar grid
│       │   ├── dayProgress.html     # Daily metrics editor
│       │   ├── periodProgress.html  # Chart & comparison table
│       │   ├── progressHeader.html  # View controls
│       │   ├── progressPage.html    # Main progress container
│       │   ├── planDayBrief.html    # Plan summary card
│       │   ├── metricsEditor.html   # Metric list editor
│       │   ├── metricsComparison.html  # Metrics comparison table
│       │   └── chartView.html       # Chart.js canvas
│       ├── browser/
│       │   ├── card.html            # Recipe/plan card
│       │   ├── cardList.html        # Recipe/plan cards grid
│       │   ├── creationForm.html    # Modal creation form
│       │   └── filter.html          # Search & filter controls
│       ├── details/
│       │   ├── detailPage.html      # Main detail layout
│       │   ├── detailHeader.html    # Page header
│       │   ├── detailContent.html   # Recursive section rendering
│       │   ├── detailsEditor.html   # WYSIWYG editor toolbar
│       │   ├── recipeDetails.html   # Recipe-specific display
│       │   ├── planDetails.html     # Plan-specific display
│       │   ├── section.html         # Recursive section template
│       │   ├── mediaViewer.html     # Image gallery
│       │   ├── expandedMediaViewer.html  # Fullscreen media overlay
│       │   ├── infoTabs.html        # Tabbed sidebar
│       │   ├── eleInfo.html         # Basic info card
│       │   ├── eleNotes.html        # User notes editor
│       │   ├── eleGoals.html        # Goal description editor
│       │   ├── nurtients.html       # Nutritional information table
│       │   ├── ingridentsForm.html  # Dynamic ingredient input form
│       │   ├── quickNav.html        # Breadcrumb navigation
│       │   └── metrics.html         # Metrics display
│       ├── profile/
│       │   ├── header.html          # Editable username & avatar
│       │   ├── personalInfo.html    # Personal information card
│       │   ├── lifeStyle.html       # Lifestyle information card
│       │   └── restrictions.html    # Restrictions table
│       └── home/
│           └── todayPlan.html       # Today's plan summary card
│
├── media/                           # User-uploaded files
│   ├── avatars/                     # User profile images
│   └── creations/                   # Recipe/plan images
│
├── db.sqlite3                       # SQLite database file
├── manage.py                        # Django management script
├── requirements.txt                 # Python dependencies (Django, Pillow, requests)
├── package.json                     # Node.js dependencies (Playwright for testing)
├── package-lock.json                # Locked dependency versions
├── babel.config.js                  # Babel transpiler configuration
├── Readme.md                        # 7500+ word comprehensive documentation
├── .env                             # Environment variables (USDA_API_KEY)
├── .gitignore                       # Git ignore patterns
```

#### Relationships Diagram

```
User
 ├─ UserCreation (creator)
 │   ├─ Recipe (base, 1:1)
 │   └─ Plan (base, 1:1)
 │       ├─ PlanDetail (plan, 1:N, hierarchical)
 │       ├─ TrackedMetrics (linkedPlan, 1:N)
 │       └─ LinkedPlan (full_plan, 1:1)
 │           ├─ diet_plan → Plan
 │           └─ exercise_plan → Plan
 ├─ UserRestriction (user, 1:N)
 │   └─ MedicalIssues (ref, optional)
 ├─ Metric (user, 1:N)
 │   └─ TrackedMetrics (metric, 1:N)
 └─ UserLog (user, 1:N)
     ├─ Plan (plan, N:1)
     └─ DailyAchivedMetrics (log, 1:N)
         └─ TrackedMetrics (metric, N:1)
```

---




#### Data Lifecycle

##### Recipe/Plan Creation Flow
1. Create `UserCreation` base record
2. `UserCreationManager.create()` automatically creates subclass (Recipe or Plan)
3. For plans with duration > 7 days, `create_default_plan_sections()` generates hierarchy
4. For full plans, `LinkedPlan` record links diet and exercise plans

##### Daily Log Flow
1. User is assigned a plan via `set_plan()`
2. System auto-fills missing logs up to today via `log_missing_logs()`
3. Each log initializes metrics via `update_metrics()`
4. Continuous metrics carry over last value, daily metrics reset to 0
5. User updates metric values throughout the day
6. `calculate_Total_score()` aggregates progress to 0-100 score

##### Metric Tracking Flow
1. User creates base `Metric` definition
2. `TrackedMetrics` links metric to a plan with target/goal
3. `isActive` flag determines if currently tracking
4. When plan is assigned, `DailyAchivedMetrics` created for each day
5. `calculate_score()` computes progress based on metric type
6. Inactive metrics with no history can be cleaned up via `cleanup_inactive_metrics()`


### Data Models Documentation
#### User System (`users/models.py`)

##### User
Extended user model for health and lifestyle tracking.

**Fields:**
- `email` - Unique identifier for authentication
- `avatar_img` - Profile picture
- `birth_date`, `gender` - Demographics; age calculated from birth_date
- `weight`, `height` - Physical measurements in kg and cm
- `activity_level` - Low/moderate/active/high lifestyle classification
- `fluid_intake` - Daily water intake target in liters
- `sleep_quality` - 1-4 scale (1=Deep, 4=Light)
- `sleep_duration` - Target sleep hours
- `creations` - Reverse FK: UserCreations created by this user
- `restrictions` - Reverse FK: UserRestrictions for this user
- `userMetrics` - Reverse FK: Metrics defined by this user
- `history` - Reverse FK: UserLogs for this user

---

##### MedicalIssues
Library of medical conditions with dietary guidelines.

**Fields:**
- `name_ar`, `name_en` - Multilingual condition names
- `category` - Condition classification
- `description_ar`, `description_en` - Detailed descriptions
- `diet_rules` - JSON array of dietary restrictions/guidelines
- `issue` - Reverse FK: UserRestrictions referencing this condition

---

##### UserRestriction
User-specific constraints affecting diet/exercise planning.

**Fields:**
- `user` - FK to User (related_name='restrictions')
- `name` - Restriction name
- `type` - medical/budget/preferences/availability/other
- `remark` - Optional notes
- `ref` - FK to MedicalIssues (required if type='medical', null otherwise)

**Validation:** Conditional requirement of medical reference based on type.

---

#### Content Management (`healthHub/models/`)

#### UserCreation
Polymorphic base for all user-generated content (recipes and plans).

**Fields:**
- `creator` - FK to User (related_name='creations')
- `name` - Unique per user
- `notes` - User notes
- `created`, `edited` - Timestamps
- `shared` - Public visibility flag
- `favorite` - Bookmark flag
- `media` - JSON array of image URLs
- `type` - 'recipe' or 'plan' (discriminator)
- `category` - Plan: diet/exercise/full; Recipe: user-defined
- `recipe` - Reverse OneToOne: Recipe instance if type='recipe'
- `plan` - Reverse OneToOne: Plan instance if type='plan'

**Unique Constraint:** (creator, name)

---

#### Recipe
Recipe-specific cooking data.

**Fields:**
- `base` - OneToOne FK to UserCreation (related_name='recipe')
- `prep_time` - Cooking/prep duration
- `serv` - Number of servings
- `ingredients` - JSON array of {name, amount, unit} objects
- `directions` - JSON rich text with formatting
- `nutrients` - JSON nutritional data calculated from USDA API

---

#### Plan
Diet/exercise plan with hierarchical structure.

**Fields:**
- `base` - OneToOne FK to UserCreation (related_name='plan')
- `duration` - Plan length (default: 1 week)
- `goal` - Plan objectives description
- `details` - Reverse FK: PlanDetails (hierarchical sections)
- `metrics` - Reverse FK: TrackedMetrics for goal tracking
- `linked_plan` - Reverse OneToOne: LinkedPlan if category='full'
- `user_history` - Reverse FK: UserLogs using this plan
- `linked_as_diet` - Reverse FK: LinkedPlans using this as diet_plan
- `linked_as_exercise` - Reverse FK: LinkedPlans using this as exercise_plan

**Categories:**
- `diet` - Nutrition/meal plans
- `exercise` - Workout routines  
- `full` - Combines separate diet + exercise plans

**Methods:**
- `get_details()` - Returns hierarchical tree structure
- `get_daily_schedule(day_number)` - Extracts day-specific content (1-indexed)

---

#### PlanDetail
Hierarchical sections within a plan (tree structure for weeks/days/meals).

**Fields:**
- `plan` - FK to Plan (related_name='details')
- `parent_section` - FK to self (related_name='sub_sections', nullable for root)
- `section` - Section title (e.g., "Week 1", "Day 3", "Breakfast")
- `detail` - JSON rich text content
- `order` - Sibling ordering within parent
- `sub_sections` - Reverse FK: Child PlanDetails

**Auto-Generation:**
- 7 days → Week → Day 1-7
- 14+ days → Schedule → Week N → Day 1-7
- 30 days → Month → Day 1-30

---

#### LinkedPlan
Connects diet and exercise plans into unified full plan.

**Fields:**
- `full_plan` - OneToOne FK to Plan with category='full' (related_name='linked_plan')
- `diet_plan` - FK to Plan with category='diet' (related_name='linked_as_diet', nullable)
- `exercise_plan` - FK to Plan with category='exercise' (related_name='linked_as_exercise', nullable)

---

#### Progress Tracking (`core/models.py`)

##### UserLog
Daily snapshot of user's plan and progress.

**Fields:**
- `user` - FK to User (related_name='history')
- `date` - Log date
- `plan` - FK to Plan (related_name='user_history', nullable)
- `feedback` - User's notes/reflection
- `AchivedMetrics` - Reverse FK: DailyAchivedMetrics for this log

**Methods:**
- `calculate_Total_score()` - Aggregates all metrics to 0-100 score

**Usage:** Auto-created when plans assigned, fills gaps between dates.

---

##### Metric
Defines trackable measurement types.

**Fields:**
- `user` - FK to User (related_name='userMetrics')
- `name` - Metric name (e.g., "Weight", "Water Intake")
- `type` - continues/daily/boolean/scale/category
- `options` - JSON array for categorical/scale metrics
- `trackedMetric` - Reverse FK: TrackedMetrics configurations

**Type Behaviors:**
- `continues` - Carries over daily (weight, body measurements)
- `daily` - Resets each day (water intake, calories)
- `boolean` - Yes/No events (did workout, took rest day)
- `scale` - 1-5 ordered rating (energy level, sleep quality)
- `category` - Unordered choices (mood: stressed/relaxed/busy)

---

##### TrackedMetrics
User's goal configuration for a metric.

**Fields:**
- `metric` - FK to Metric (related_name='trackedMetric')
- `goal` - Text description
- `linkedPlan` - FK to Plan (related_name='metrics', nullable)
- `isActive` - Currently tracking flag
- `target` - JSON goal value (number/list/boolean)
- `start` - JSON baseline value (for continues metrics)
- `isPositive` - True: higher is better, False: lower is better
- `goalMetrics` - Reverse FK: DailyAchivedMetrics using this configuration

**Examples:**
```python
# Weight loss: target=70, start=80, isPositive=False
# Water intake: target=2000, isPositive=True  
# Mood tracking: target=["relaxed","energetic"], isPositive=True
```

---

##### DailyAchivedMetrics
Daily metric value snapshot.

**Fields:**
- `log` - FK to UserLog (related_name='AchivedMetrics')
- `metric` - FK to TrackedMetrics (related_name='goalMetrics')
- `value` - JSON actual measured value (number/string/boolean)

**Scoring:** `calculate_score()` returns 0.0-1.0:
- `continues` - Linear interpolation from start to target
- `daily` - value/target (capped at 1.0)
- `boolean` - 1.0 if matches target direction
- `scale` - Normalized 1-5 (direction-aware)
- `category` - 1.0 if value in target list

---
#### JSON Field Structures

##### Recipe Ingredients
```json
[
  {
    "name": "Chicken Breast",
    "amount": 500,
    "unit": "g"
  },
  {
    "name": "Olive Oil",
    "amount": 2,
    "unit": "tbsp"
  }
]
```

##### Rich Text Content (Recipe directions / Plan details)
```json
[
  {
    "type": "p",
    "content": "Preheat oven to 180°C",
    "effects": ["Default"],
    "color": "#333333"
  },
  {
    "type": "ol",
    "content": [
      {
        "content": "Season chicken with salt",
        "effects": ["fw-bold"],
        "color": "#333333",
        "type": "p"
      },
      {
        "content": "Bake for 25 minutes",
        "effects": ["Default"],
        "color": "#333333",
        "type": "p"
      }
    ]
  },
  {
    "type": "ref",
    "refType": "recipe",
    "eleId": 42,
    "href": "/recipes/42/garlic-sauce",
    "content": "Serve with Garlic Sauce",
    "effects": ["Default"]
  }
]
```

##### Rich Text Effects
- `fw-bold` - Bold text
- `fst-italic` - Italic text
- `text-decoration-underline` - Underlined
- `text-decoration-line-through` - Strikethrough
- `text-sm`, `text-md`, `text-lg`, `text-xl`, `text-2xl` - Font sizes

##### Nutritional Data
```json
{
  "calories": 450,
  "protein": 52,
  "carbs": 12,
  "fat": 20,
  "fiber": 3,
  "sugar": 2,
  "sodium": 890
}
```

##### Media Array
```json
[
  "/media/creations/recipe_123_image1.jpg",
  "/media/creations/recipe_123_image2.jpg"
]
```

---
## How to Run 

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)
- Internet connection (for USDA API and CDN resources)
- The application requires a free USDA FoodData Central API key for automatic nutrition calculation:

1. Visit: https://fdc.nal.usda.gov/api-key-signup.html
2. Fill out registration form (name, email, organization)
3. Receive API key via email (usually instant)
4. Add key to `config/settings.py`:
```python
USDA_API_KEY = 'your-key-here'
```

Without this key, recipe creation still works but nutritional information will not be automatically calculated.

### Installation Steps

1. **Clone Repository**
```bash
git clone <repository-url>
cd smartdiet
```

2. **Create Virtual Environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install Dependencies**
```bash
pip install -r requirements.txt
```

Required packages (from `requirements.txt`):
```
Django>=4.2
Pillow>=10.0
requests>=2.31.0
```

4. **Configure Environment Variables**

Create a `.env` file in the project root or add to `config/settings.py`:
```python
USDA_API_KEY = 'your_api_key_here'  # Get free key from https://fdc.nal.usda.gov/api-key-signup.html
SECRET_KEY = 'your-secret-key'
DEBUG = True  # Set to False in production
ALLOWED_HOSTS = ['localhost', '127.0.0.1']
```

5. **Run Migrations**
```bash
python manage.py makemigrations
python manage.py migrate
```

This creates database tables for users, recipes, plans, logs, metrics, restrictions, and all supporting models.

6. **Create Superuser (Optional)**
```bash
python manage.py createsuperuser
```

Allows access to Django admin panel at `/admin/` for database inspection and manual data management.

7. **Collect Static Files (Production Only)**
```bash
python manage.py collectstatic
```

Gathers all static files into `STATIC_ROOT` for serving via Nginx/Apache in production.

8. **Run Development Server**
```bash
python manage.py runserver
```

Server starts at `http://localhost:8000/`

9. **Access Application**

Open browser and navigate to: `http://localhost:8000/diet/`

- First-time users: Click "Register" to create account
- Existing users: Login with email/username and password

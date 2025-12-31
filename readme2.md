SmartDiet - Comprehensive Health & Fitness Management System
Distinctiveness and Complexity
Why This Project is Distinct from Previous CS50W Projects
Not an E-Commerce Platform (Project 2 - Commerce):
SmartDiet is fundamentally a personal health management system, not a marketplace. While Commerce focuses on buying, selling, bidding, and transactions, SmartDiet focuses on health data tracking, personalized nutrition planning, and fitness progress monitoring. There are no auctions, no product listings, no shopping carts, and no payment systems. Instead, the application centers on:

Creating and managing personalized meal plans and exercise routines
Tracking daily health metrics (weight, water intake, sleep quality)
Monitoring progress toward health goals over time
Managing dietary restrictions and medical conditions
Calculating nutritional information from recipes

Not a Social Network (Project 4 - Network):
SmartDiet is not a social platform. While users can share recipes and plans publicly, there is no social feed, no following/followers system, no likes or comments, and no friend connections. The core functionality revolves around private health tracking and personal wellness management:

User data is private by default
Sharing is optional and unidirectional (no social graph)
Focus on individual health journeys, not social interaction
No messaging, notifications, or activity feeds

The "discover" feature allows browsing others' shared content for inspiration, but this is fundamentally different from social networking—it's more akin to a recipe blog or fitness plan repository than Twitter or Facebook.
Complexity Breakdown
This project demonstrates substantial complexity across multiple dimensions that far exceed previous CS50W projects:
1. Advanced Multi-Model Data Architecture
The application implements sophisticated database relationships spanning three interconnected Django apps:
Polymorphic Model Design:

UserCreation base model with type discrimination (Recipe vs Plan)
Custom manager implementing automatic subclass creation
One-to-one relationships maintaining referential integrity
Enables unified browsing/searching across different content types

Hierarchical Plan Structure:

Unlimited-depth nested sections via self-referential PlanDetail model
Order management with automatic sibling reordering
JSON-based content storage supporting multiple block types (paragraphs, lists, references)
Recursive rendering via custom Django template tag

Complex Metric Tracking System:

Five distinct metric types with unique scoring algorithms:

Continuous: Progressive tracking (e.g., weight loss from 80kg → 70kg)
Daily: Reset accumulation (e.g., water intake)
Boolean: Yes/No events (e.g., cheat day)
Scale: Ordered ratings (1-5 exhaustion levels)
Category: Unordered choices (mood states)


Bi-directional goal orientation (higher is better vs lower is better)
Historical data carryover for continuous metrics
Plan-linked vs global metrics with auto-activation

2. Sophisticated Backend Logic (1000+ Lines)
Automated Plan Management:

get_current_plan(): Automatically fills missing logs from last entry to today
Multi-log-per-day architecture (separate diet and exercise logs on same date)
log_missing_logs(): Backfills entries maintaining data continuity
update_metrics(): Initializes metrics with intelligent value carryover
Plan replacement logic handling edge cases (today vs historical dates)

Dynamic Metric Initialization:
python# Continuous metrics carry forward last value
last_value = DailyAchivedMetrics.objects.filter(
    metric=tracked_metric,
    log__date__lt=log_date
).order_by('-log__date').first()

# Daily metrics reset to zero
# Boolean defaults to False
# Scale defaults to middle value (3)
# Category defaults to first option
Complex Scoring Algorithms:
Each metric type has custom progress calculation:
python# Continuous: Linear interpolation
progress = (current - start) / (target - start)

# Daily: Percentage with cap
score = min(1.0, current / target)

# Boolean: Direction-dependent
score = 1.0 if (is_true and positive) or (not is_true and negative) else 0.0

# Scale: Normalized with direction
score = value / 5.0 if positive else 1.0 - (value / 5.0)

# Category: Target list matching
score = 1.0 if value in target_list else 0.0
Period Comparison Analytics:
formatMetricPeriodSummery() generates comparative statistics:

Calculates start/current/change values per metric type
Aggregates multiple entries per period (averages for daily, latest for continuous)
Percentage calculations for boolean metrics
Descriptive labels for scale metrics (Low → Optimal)
Target compliance rates for categories

3. External API Integration with Advanced Unit Conversion
USDA FoodData Central Integration:

Real-time nutrition calculation for 30+ nutrients
Batch processing of ingredient lists
Error handling with graceful degradation
Detailed logging for debugging

Comprehensive Unit Conversion System (500+ lines):
Handles 50+ units across multiple categories:
pythonWEIGHT_CONVERSIONS = {'g': 1, 'kg': 1000, 'oz': 28.35, 'lb': 453.592}
VOLUME_CONVERSIONS = {'ml': 1, 'cup': 240, 'tbsp': 15, 'tsp': 5}
INGREDIENT_DENSITIES = {'flour': 120, 'sugar': 200, 'milk': 245}  # grams/cup
SPECIFIC_CONVERSIONS = {
    ('garlic', 'clove'): 3,
    ('butter', 'stick'): 113,
    ('egg', 'piece'): 50
}
Priority-based conversion logic:

Direct weight conversions (most reliable)
Ingredient-specific pairs (garlic clove = 3g)
Volume with ingredient density (flour cup = 120g)
Imprecise units with defaults and warnings
Unknown units treated as grams with alerts

4. Advanced Frontend Architecture
Alpine.js Component System:
Seven JavaScript classes managing complex UI logic:

HomeManager: Plan selection, day data loading, metric updates
Profile: Username/avatar updates, restrictions CRUD, input tracking
DayProgress: Metric editor, feedback saving, plan brief display
PeriodProgress: Chart rendering, metric comparison, period navigation
Calendar: Month navigation, day selection, plan indicators
CardList: Favorite/share toggles, deletion, pagination coordination
CreationForm: Multi-step validation, category autocomplete, modal management

Reactive State Management:
javascriptx-data="{
  user: {{user}},              // Django context injection
  todayPlans: {{todayPlans}},
  selectedDate: new Date().toISOString().split('T')[0],
  metrics: [],
  feedback: '',
  isSaving: false
}"
Custom Template Tags:
{% recursetree %} enables recursive rendering of unlimited-depth hierarchies:
pythonclass RecurseTreeNode(template.Node):
    def render_nodes(self, nodes, context):
        for node in nodes:
            context['node'] = node
            if node.get('subSections'):
                context['children'] = self.render_nodes(node['subSections'], context)
            output += self.nodelist.render(context)
        return mark_safe(output)
5. Rich Content Editor
Inline WYSIWYG Editing:

contenteditable sections with blur-save pattern
Format bar with text styling (bold, italic, underline, strikethrough)
Font size and color controls
Three content block types: paragraphs, ordered lists, unordered lists
Reference system linking recipes and plan sections
Drag-and-drop reordering
Real-time preview

JSON Content Structure:
json{
  "type": "p",
  "content": "Daily cardio session",
  "effects": ["bold", "text-lg"],
  "color": "#ff5733"
}
Reference Blocks:
json{
  "type": "ref",
  "refType": "recipe",
  "eleId": 123,
  "content": "Protein Smoothie",
  "href": "/diet/collections/recipes/123/protein-smoothie/"
}
Orphaned reference cleanup prevents errors when linked content is deleted.
6. Comprehensive Form System
Three-Tier Form Architecture:

BaseCreationForm: Common fields with username uniqueness enforcement
RecipeForm: Prep time splitting, ingredient deduplication, auto-nutrition calculation
PlanForm: Duration presets, linked plan selection for FULL plans

Real-Time Validation:
Alpine.js integration with Django forms:
javascriptget_inputs_attr(refs, key, mapping, err_msg):
  return {
    '@focus': 'removeError(...)',
    '@blur': 'validateInput(...)',
    'x-ref': key,
    'x-init': f'{mapping}.{key} = {refs}.{key}'
  }
Custom Widgets:

PasswordWithToggleInput: Show/hide toggle with Alpine.js state
NoLabelForCustomWidgetBoundField: Conditional label rendering based on widget attribute
Template-based rendering with Alpine.js integration

Project Features
Core Functionality
1. User Management

Registration with email (username auto-derived from email prefix)
Secure authentication with password strength validation (8 chars, uppercase, lowercase, special character)
Profile management with editable fields:

Avatar upload with preview
Personal info (birth date, gender, weight, height)
Lifestyle data (activity level, fluid intake, sleep quality/duration)
Health restrictions (medical, budget, preferences, availability)



2. Recipe Management

Create recipes with ingredients and directions
Automatic nutrition calculation via USDA API (30+ nutrients)
Preparation time tracking (hours/minutes)
Servings management
Category organization
Media gallery (images with upload/link/expand)
Rich text directions with formatting and references
Public sharing toggle
Favorite marking

3. Plan Management

Three plan types:

Diet plans: Meal schedules and nutrition guidance
Exercise plans: Workout routines and fitness goals
Full plans: Combined diet + exercise (links to existing plans)


Hierarchical section structure (unlimited depth)
Daily schedule generation with customizable duration (1 day - months)
Goal descriptions
Linked metrics for progress tracking
Default section templates:

7-day: "Week Schedule" → "Day 1-7"
14+ days: "Schedule" → "Week 1/2/3" → "Day 1-7"
30-day: "Month Schedule" → "Day 1-30"



4. Progress Tracking

Daily logs with automatic creation
Plan assignment with date range
Metric tracking with five types:

Continuous (weight, measurements)
Daily (water, calories)
Boolean (cheat day, workout completed)
Scale (energy level 1-5)
Category (mood: calm/stressed/busy)


Custom metrics with plan-linking or global scope
Daily feedback notes
Average score calculation (0-100%)

5. Analytics & Visualization

Calendar view with plan indicators
Period comparison (day/week/month/year)
Chart.js progress graphs
Metric comparison tables showing:

Start value
Current value
Change amount
Target
Achievement percentage


Progress summary

6. Content Discovery

Browse personal collection with filters:

Search by name
Filter by type (recipe/plan)
Filter by category
Filter by favorite/shared status
Sort by edited/created date, name, creator


Discover public content from other users
Clone shared recipes/plans to personal collection
Card grid layout with pagination

7. Rich Content System

Inline editing with contenteditable
Format toolbar (text styling, size, color)
Content blocks (paragraphs, ordered/unordered lists)
Internal references (link recipes, link plan sections)
External links
Orphaned reference cleanup

Advanced Features
8. Multi-Log-Per-Day Architecture
Users can have both diet and exercise plans active simultaneously:

Separate logs for diet and exercise on same date
Independent metric tracking per plan type
Automatic metric initialization based on plan category
Fallback logic when one plan type missing

9. Intelligent Metric Management

Auto-activation when plan assigned
Auto-deactivation when plan changes
Inactive metric archive with reactivation
Historical data preservation
Value carryover for continuous metrics
Reset logic for daily metrics

10. Plan Day Scheduling
Smart section matching for daily schedules:
python# Supports multiple patterns:
"Day 1" → exact match
"Days 1-3" → range match
"Day 1, 3, 5" → list match
"Week 1 Days 1-5" → nested match
11. Media Management

Multi-image galleries
Upload from device
Add via URL
Expand/fullscreen view
Delete with orphan cleanup (checks if other elements reference same image)
Carousel navigation

12. Category Autocomplete

Dynamic suggestions from user's existing categories
Keyboard navigation (arrow keys, enter)
Default categories (Breakfast, Lunch, Dinner, Snack, Dessert, Beverage)
Auto-filtering as user types

13. Responsive Design

Mobile-first CSS approach
Breakpoint-specific stylesheets:

Mobile: <768px
Tablet: <992px
Desktop: >1025px


Book layout with page toggle on mobile
Touch-friendly controls
Collapsible sections

14. Theme System

Dark/light mode toggle
Alpine.js reactive theming
Persistent preference (localStorage)
CSS custom properties for colors

Technology Stack
Backend

Django 4.2+: Web framework
Python 3.8+: Programming language
SQLite: Database (development)
PostgreSQL: Database (production ready)

Frontend

Alpine.js 3.x: Reactive JavaScript framework
Bootstrap 5.3.3: CSS framework
Font Awesome 6.0: Icon library
Chart.js: Data visualization
Vanilla JavaScript: Custom component classes

APIs & Libraries

USDA FoodData Central API: Nutrition data
Pillow: Image processing
Requests: HTTP library for API calls

Development Tools

Git: Version control
pip: Package management
virtualenv: Python environment isolation

Requirements
Python Packages (requirements.txt)
txtDjango>=4.2
Pillow>=10.0
requests>=2.31.0
decorator-include>=3.0
Environment Variables
python# settings.py or .env
USDA_API_KEY = 'your_api_key_here'  # Get from https://fdc.nal.usda.gov/api-key-signup.html
SECRET_KEY = 'your-secret-key'
DEBUG = True  # False in production
ALLOWED_HOSTS = ['localhost', '127.0.0.1']
```

### System Requirements
- Python 3.8 or higher
- 100MB+ disk space
- Internet connection (for USDA API, CDN resources)

## Project Structure
```
smartdiet/
├── config/                          # Project configuration
│   ├── settings.py                  # Django settings
│   ├── urls.py                      # Root URL configuration
│   └── wsgi.py                      # WSGI entry point
│
├── users/                           # User management app
│   ├── models.py                    # User, MedicalIssues, UserRestriction
│   ├── views.py                     # Auth and profile views
│   ├── forms/
│   │   ├── login_form.py           # Login with username/email
│   │   └── register_form.py        # Registration with validation
│   ├── widgets/
│   │   ├── password_with_toggel.py # Custom password widget
│   │   └── suppress_label.py       # Conditional label rendering
│   ├── helpers/
│   │   ├── profile_update.py       # Profile update logic
│   │   ├── validators.py           # Password strength validator
│   │   └── get_inputs_atrr.py      # Alpine.js attribute generator
│   └── urls.py
│
├── core/                            # Progress tracking app
│   ├── models.py                    # UserLog, Metric, TrackedMetrics, DailyAchivedMetrics
│   ├── views.py                     # 15 views for tracking and analytics
│   ├── helpers/
│   │   ├── assigned_plans.py       # Plan management (500+ lines)
│   │   ├── helpers.py              # Period calculations, metric formatting
│   │   └── serializer.py           # Model serialization
│   └── urls.py
│
├── healthHub/                       # Content management app
│   ├── models/
│   │   ├── base.py                 # UserCreation (polymorphic base)
│   │   ├── recipe.py               # Recipe model
│   │   ├── plan.py                 # Plan, PlanDetail, LinkedPlan
│   │   ├── managers.py             # Custom creation manager
│   │   └── serializers.py          # JSON serialization
│   ├── forms.py                    # BaseCreationForm, RecipeForm, PlanForm
│   ├── views.py                    # Browse, detail, CRUD operations
│   ├── helpers/
│   │   ├── creationManage.py       # Creation and cloning logic
│   │   ├── nurtientCalculator.py   # USDA API integration (500+ lines)
│   │   ├── helpers.py              # Hierarchical formatting
│   │   ├── construct_query.py      # Filter construction
│   │   ├── paginator.py            # Pagination utility
│   │   └── context_processors.py   # Template context
│   ├── templatetags/
│   │   └── nested_tags.py          # Recursive rendering tag
│   └── urls.py
│
├── templates/                       # Django templates
│   ├── layout.html                 # Base template
│   ├── index.html                  # Dashboard
│   ├── profile.html                # User profile
│   ├── browser.html                # Browse/discover
│   ├── details.html                # Recipe/plan details
│   ├── logs.html                   # Progress logs
│   ├── auth.html                   # Login/register
│   ├── error.html                  # Error pages
│   └── components/                 # Reusable components
│       ├── authForm.html
│       ├── navBar.html
│       ├── paginator.html
│       ├── browser/
│       │   ├── cardList.html
│       │   ├── creationForm.html
│       │   └── filter.html
│       ├── profile/
│       │   ├── header.html
│       │   ├── personalInfo.html
│       │   ├── lifeStyle.html
│       │   └── restrictions.html
│       ├── progress/
│       │   ├── calendar.html       # Monthly calendar
│       │   ├── dayProgress.html    # Daily tracking
│       │   ├── periodProgress.html # Period analytics
│       │   ├── progressHeader.html # Controls
│       │   ├── planDayBrief.html   # Plan summary
│       │   ├── metricsEditor.html  # Metric CRUD
│       │   ├── metricsComparison.html
│       │   └── chartView.html
│       ├── details/
│       │   ├── detailPage.html
│       │   ├── detailHeader.html
│       │   ├── detailContent.html  # Recursive content rendering
│       │   ├── detailsEditor.html  # WYSIWYG editor
│       │   ├── recipeDetails.html
│       │   ├── planDetails.html
│       │   ├── section.html        # Recursive section rendering
│       │   ├── mediaViewer.html
│       │   ├── expandedMediaViewer.html
│       │   ├── infoTabs.html
│       │   ├── eleInfo.html
│       │   ├── eleNotes.html
│       │   ├── eleGoals.html
│       │   ├── nurtients.html
│       │   ├── ingridentsForm.html
│       │   └── quickNav.html       # Breadcrumb navigation
│       └── home/
│           └── todayPlan.html
│
├── static/                          # Static files
│   ├── common/
│   │   ├── script.js               # Theme toggle, utilities
│   │   ├── styles.css              # Base styles
│   │   ├── styles-mobile.css       # Mobile-specific
│   │   ├── styles-tablet.css       # Tablet-specific
│   │   ├── styles-desktop.css      # Desktop-specific
│   │   ├── paginator.js            # Paginator class
│   │   ├── creationForm.js         # CreationForm class
│   │   ├── creationForm.css
│   │   └── ingridentForm.css
│   ├── auth/
│   │   ├── script.js               # AuthForm class
│   │   └── styles.css
│   ├── profile/
│   │   ├── script.js               # Profile class
│   │   └── styles.css
│   ├── home/
│   │   ├── script.js               # HomeManager class
│   │   └── styles.css
│   ├── browser/
│   │   ├── script.js               # CardList class
│   │   └── styles.css
│   ├── details/
│   │   ├── script.js               # Plan/Recipe detail classes
│   │   └── styles.css
│   ├── progress/
│   │   ├── script.js               # DayProgress, PeriodProgress, Calendar classes
│   │   └── styles.css
│   └── assets/
│       ├── logo.png
│       └── profile.jpg
│
├── media/                           # User uploads
│   ├── profile_images/
│   ├── recipes/
│   └── plans/
│
├── manage.py
├── requirements.txt
└── README.md
Installation & Setup
1. Clone Repository
bashgit clone <repository-url>
cd smartdiet
2. Create Virtual Environment
bashpython -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
3. Install Dependencies
bashpip install -r requirements.txt
4. Configure Environment
Create a .env file or add to settings.py:
pythonUSDA_API_KEY = 'your_api_key_here'
SECRET_KEY = 'your-secret-key'
DEBUG = True
Get a free USDA API key from: https://fdc.nal.usda.gov/api-key-signup.html
5. Run Migrations
bashpython manage.py makemigrations
python manage.py migrate
6. Create Superuser (Optional)
bashpython manage.py createsuperuser
7. Load Initial Data (Optional)
bash# If you have fixtures for medical issues or sample data
python manage.py loaddata medical_issues.json
8. Collect Static Files (Production)
bashpython manage.py collectstatic
9. Run Development Server
bashpython manage.py runserver
10. Access Application
Open browser and navigate to: http://localhost:8000/diet/
Usage Guide
Getting Started

Register/Login: Create an account on the authentication page
Complete Profile: Add personal info, lifestyle data, and health restrictions
Create Content:

Click "+" button in browse page
Choose Recipe or Plan
Fill in details


Assign Plans: Select plans on home page for diet and exercise
Track Progress: Update daily metrics and add feedback
View Analytics: Check calendar and period views for progress insights

Creating a Recipe

Navigate to Browse → Click "+" button → Select Recipe
Fill in basic information:

Name (required)
Category (e.g., Breakfast, Lunch)
Notes (optional)


Add recipe details:

Prep time (hours and minutes)
Servings
Ingredients (name, amount, unit)


Click "Create"
On detail page, add directions using the editor:

Click edit icon next to "Directions"
Add paragraphs and lists
Format text with toolbar
Link to other recipes
Save changes



Nutrition is automatically calculated when you save ingredients.
Creating a Plan

Navigate to Browse → Click "+" button → Select Plan
Choose plan type:

Diet: Meal planning
Exercise: Workout routines
Full: Combined (requires existing diet and exercise plans)


Set duration:

Use preset (1 day, 1 week, 2 weeks, 1 month)
Or enter custom days


Add goal description
Check "Create default daily sections" for automatic structure
Click "Create"
On detail page, customize sections:

Edit section names
Add content to each day
Link recipes for meals
Rearrange sections by dragging
Add subsections with "+" button



Tracking Progress

On home page, ensure plans are assigned
Select date (defaults to today)
Choose plan type (Diet or Exercise)
Update metrics:

Number inputs for continuous/daily metrics
Yes/No buttons for boolean metrics
Dropdowns for scale/category metrics


Add daily feedback
View average score in header

Adding Custom Metrics

On progress page, click "G+" (Add Custom Goal) or "P+" (Add Plan Metric)
Choose existing metric or create new:

Enter metric name
Select type (continuous, daily, boolean, scale, category)
Set target value
Add goal description
Choose direction (higher/lower is better)


For category metrics, enter options (comma-separated)
Save metric

Metrics are automatically tracked for selected date's log.
Viewing Analytics
Calendar View (Logs Page):

Click any date to view that day's data
Green highlight indicates plan assigned
Badges show diet (D) and exercise (E) day numbers

Period Views:

Select period (Week/Month/Year) in header
View progress chart showing overall score
Hover over metrics table to highlight specific metric in chart
Compare start vs current values with change indicators

Sharing Content

Navigate to recipe or plan detail page
Click settings icon (if owner)
Toggle "Shared" to make public
Others can discover in Discover tab
Others can clone to their collection

File Descriptions
Backend Files
config/urls.py - Root URL configuration with custom 404 handler, namespace organization, media file serving
users/models.py - Extended User model with health fields, MedicalIssues for dietary restrictions, UserRestriction for user-specific constraints
users/views.py - Authentication (login, register, logout), profile viewing and updating, restrictions CRUD via class-based view
users/forms/login_form.py - Combined username/email login with database authentication and custom error messages
users/forms/register_form.py - Email-based registration with password strength validation and confirmation matching
users/widgets/password_with_toggel.py - Custom widget rendering password field with Alpine.js show/hide toggle
users/widgets/suppress_label.py - Meta-programming for conditional label rendering based on widget attribute
users/helpers/profile_update.py - Functions for updating avatar, username, and user data fields with validation
users/helpers/validators.py - Custom Django password validator enforcing uppercase, lowercase, and special characters
users/helpers/get_inputs_atrr.py - Generates Alpine.js attributes (x-ref, @focus, @blur) for form inputs
core/models.py - UserLog (daily snapshots), Metric (base definitions), TrackedMetrics (user configs), DailyAchivedMetrics (daily values with scoring)
core/views.py - 15 views managing logs, metrics, feedback, plan assignment, and analytics
core/helpers/assigned_plans.py - 500+ lines of plan management logic: get_current_plan, set_plan, update_metrics, metric initialization
core/helpers/helpers.py - Period date calculations, metric formatting for comparisons, scale label conversion
core/helpers/serializer.py - Converts models to dictionaries for JSON responses
core/helpers/ajaxRedirect.py - Returns JsonResponse with X-Redirect header for client-side navigation
core/helpers/validators.py - Image validation checking type and size limits
healthHub/models/base.py - Polymorphic UserCreation model with type discrimination and custom manager
healthHub/models/recipe.py - Recipe model with ingredients, directions, and auto-calculated nutrients
healthHub/models/plan.py - Plan with hierarchical details, LinkedPlan for full plans, get_daily_schedule method
healthHub/models/managers.py - Custom manager with create() override for polymorphic instantiation, default section generation
healthHub/models/serializers.py - Converts UserCreation, Recipe, Plan to dictionaries with URL paths
healthHub/forms.py - Three-tier form system: BaseCreationForm, RecipeForm (with nutrition trigger), PlanForm (with duration presets)
healthHub/views.py - Browse with filtering, detail CRUD, media management, section operations
healthHub/helpers/creationManage.py - CreationHelper class with create_element, create_Clone, hierarchical cloning
healthHub/helpers/nurtientCalculator.py - 500+ lines of USDA API integration and unit conversion (50+ units, ingredient-specific densities)
healthHub/helpers/helpers.py - format_plan_details (hierarchical), remove_Orphaned_refs (cleanup), getLinksData (reference options)
healthHub/helpers/construct_query.py - Builds Django filters/excludes from GET parameters
healthHub/helpers/paginator.py - Simple pagination with validation and slice logic
healthHub/helpers/context_processors.py - Provides category suggestions to all templates
healthHub/templatetags/nested_tags.py - Custom {% recursetree %} tag for unlimited-depth recursive rendering
Frontend Files
templates/layout.html - Base template with Alpine.js, Bootstrap, responsive CSS, theme system, conditional navigation
templates/index.html - Dashboard with two-page book layout, plan display, progress tracking, mobile toggle
templates/profile.html - Split-screen profile editor with personal info, lifestyle, restrictions
templates/browser.html - Browse/discover page with filter bar, card grid, pagination wrapper
templates/details.html - Detail page wrapper with paginator and child template injection
templates/logs.html - Progress logs with calendar (left) and analytics (right), Chart.js integration
templates/auth.html - Authentication page with logo and HTMX form switching
templates/error.html - Custom error display with code, title, message, home link
templates/components/authForm.html - Authentication form with Alpine.js validation, real-time errors, form switching
templates/components/navBar.html - Main navigation with route highlighting via Alpine.js location binding
templates/components/paginator.html - Pagination wrapper with prev/next arrows and child template slot
templates/components/browser/cardList.html - Card grid with x-for loop, context menus, favorite/share/delete actions
templates/components/browser/creationForm.html - Modal form with tabs (Recipe/Plan), category autocomplete, validation
templates/components/browser/filter.html - Search input, type/order selectors, multi-select category filter, action buttons
templates/components/profile/header.html - Editable username and avatar with double-click activation, file upload
templates/components/profile/personalInfo.html - Collapsible card with email, age, birth date, gender, weight, height
templates/components/profile/lifeStyle.html - Activity level, fluid intake, sleep quality/duration
templates/components/profile/restrictions.html - Table grouped by type, medical dropdown, free text inputs
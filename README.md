# SmartDiet - Intelligent Diet & Exercise Planning Application

## Distinctiveness and Complexity

### Why This Project is Distinct

**Not an E-Commerce Platform (Project 2):**
SmartDiet is fundamentally a personal health management and progress tracking system, not a marketplace. While Project 2 (Commerce) focuses on buying, selling, bidding, and financial transactions, SmartDiet centers on health data tracking, personalized nutrition planning, and fitness progress monitoring with no commercial aspects whatsoever. There are no auctions, product listings, shopping carts, or payment systems. Instead, the application provides:

- Real-time progress tracking with five distinct metric types (continuous, daily, boolean, scale, category)
- Automated plan scheduling with intelligent date-based section matching
- Historical data analysis with Chart.js visualizations showing trends over time
- Complex metric scoring algorithms tailored to each metric type
- USDA API integration for automatic nutritional calculation
- Hierarchical plan structures with unlimited nesting depth

**Not a Social Network (Project 4):**
SmartDiet is not a social platform despite having a discovery feature. There is no social feed, no following/followers system, no likes, no comments, and no friend connections. The core functionality revolves around private health tracking and personal wellness management:

- User data is private by default with optional one-way sharing
- No social graph or relationship modeling between users
- Focus on individual health journeys tracked through daily logs
- No messaging system, notifications, or activity feeds
- The "discover" feature is a content repository (similar to a recipe blog) rather than social networking

The sharing mechanism is fundamentally different from social networks - it's a read-only content discovery system where users can clone public recipes/plans to their personal collection, not interact with creators.

### Complexity Breakdown

This project demonstrates substantial complexity across multiple dimensions:

#### 1. Advanced Data Architecture & Query Optimization

**React Query-Inspired Caching System:**
The application implements a sophisticated client-side caching layer (`QueryCache.js`) that manages API responses with TTL (Time To Live), stale-while-revalidate patterns, and automatic background refetching:

```javascript
// Intelligent cache management with lifecycle hooks
query(queryKey, {
  queryFn,           // Data fetching function
  prefetch,          // Pre-request preparation
  onLoading,         // Loading state handler
  onSuccess,         // Success callback
  onError,           // Error handler
  ttl: 300000,       // 5-minute cache
  force: false       // Cache bypass option
})
```

This system reduces unnecessary API calls, improves perceived performance, and provides a consistent data layer across components. The cache automatically marks entries as stale after TTL expiration but continues serving stale data while fetching fresh data in the background.

**Polymorphic Model Design:**
The backend uses Django's model inheritance with a custom manager that automatically creates the correct subclass (Recipe or Plan) based on a type discriminator field. This enables unified querying and browsing across different content types while maintaining type-specific fields and behavior.

**Hierarchical Plan Structure:**
Plans support unlimited-depth nested sections via self-referential relationships in the `PlanDetail` model. Each section can contain subsections, which can contain their own subsections indefinitely. The system includes:

- Order management with automatic sibling reordering on deletion
- JSON-based content storage supporting multiple block types (paragraphs, lists, internal references)
- Recursive rendering via custom Django template tag (`{% recursetree %}`)
- Drag-and-drop section reorganization with real-time updates

#### 2. Sophisticated Metric Tracking System (500+ lines)

The application implements five distinct metric types, each with unique storage, validation, and scoring algorithms:

**Continuous Metrics** (e.g., weight loss from 80kg → 70kg):
- Progressive tracking with value carryover from previous entries
- Linear interpolation scoring: `(current - start) / (target - start) × 100%`
- Handles both "higher is better" and "lower is better" goals

**Daily Metrics** (e.g., water intake):
- Reset accumulation each day
- Percentage-based scoring with cap: `min(100%, current / target × 100%)`
- Aggregation for period views (averages across days)

**Boolean Metrics** (e.g., completed workout):
- Yes/No tracking with directional goals
- Binary scoring: `1.0` if goal met, `0.0` otherwise
- Period percentage calculation (days goal met / total days)

**Scale Metrics** (1-5 ratings like energy level):
- Ordered discrete values with descriptive labels
- Normalized scoring with direction: `value / 5.0` or `1.0 - (value / 5.0)`
- Label mapping (1: Low, 2: Below Average, 3: Average, 4: Good, 5: Optimal)

**Category Metrics** (mood: calm/stressed/busy):
- Unordered choice tracking
- Target list matching: `1.0` if current value in target list, else `0.0`
- Custom option sets per metric

**Automated Data Management:**
The system implements `get_current_plan()` which automatically fills missing logs from the last entry to today, ensuring data continuity. When users assign a new plan, the system:

1. Checks for existing active plans and handles replacement logic
2. Initializes all plan-linked metrics with appropriate starting values
3. Carries forward last values for continuous metrics
4. Resets daily metrics to zero
5. Sets default values for boolean (false), scale (3), and category (first option) metrics

#### 3. External API Integration with Advanced Unit Conversion (500+ lines)

**USDA FoodData Central Integration:**
The application connects to the USDA API to calculate nutritional information for recipes automatically. When users save ingredients, the backend:

1. Parses ingredient names and quantities
2. Queries USDA FoodData Central for matching foods
3. Retrieves 30+ nutrients (calories, protein, fats, vitamins, minerals)
4. Converts user-entered units to grams using the comprehensive unit system
5. Scales nutrients based on serving sizes
6. Aggregates totals across all ingredients
7. Stores complete nutritional profile with the recipe

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

Unknown units are treated as grams with console warnings for debugging.

#### 4. Component-Based Architecture with Lifecycle Management

**Abstract Component Base Class:**
All UI components extend a base `Component` class that provides:

```javascript
class Component {
  static instances = {};  // Component registry
  
  constructor(el, refs, data) {
    this.$el = el;           // DOM element reference
    this.$refs = refs;       // Child element references
    this.$data = data;       // Alpine.js reactive data
    this.instanceId = uniqueId;
    Component.instances[this.instanceId] = this;
  }
  
  swapContent(html)         // Replace component HTML
  createEle(payload, target) // Create child component
  updateData(newData)       // Update reactive state
  delete()                  // Cleanup and removal
  refreshRefs()             // Re-sync Alpine.js refs
}
```

**Component Registry System:**
Each component instance is registered with a unique ID, enabling:
- Event delegation to find the correct component instance from DOM events
- Parent-child component communication
- Proper cleanup to prevent memory leaks
- Dynamic component creation and destruction

**Seven Major Components:**

1. **Calendar** (`Calendar.js` - 200+ lines):
   - Generates monthly calendar grids with previous/next month overflow days
   - Fetches plan assignments for each day in the displayed month
   - Handles navigation with boundary checks (user start date to today)
   - Highlights today, selected date, and dates with assigned plans
   - Shows plan indicators (D for diet, E for exercise) with day numbers

2. **ProgressHeader** (`ProgressHeader.js` - 100+ lines):
   - Manages view switching between day/week/month/year periods
   - Toggles between diet and exercise plan types
   - Fetches and caches average achievement scores per period
   - Coordinates data reloading across DayProgress and PeriodProgress components

3. **DayProgress** (`DayProgress.js` - 400+ lines):
   - Loads daily plan data including sections, metrics, and feedback
   - Implements metric CRUD operations (Create, Read, Update, Delete)
   - Handles metric type switching with appropriate default values
   - Manages metric reactivation from inactive archive
   - Auto-saves feedback with timestamp display
   - Integrates with existing metrics (reuse instead of recreate)

4. **PeriodProgress** (`PeriodProgress.js` - 250+ lines):
   - Fetches aggregated period data (week/month/year)
   - Initializes Chart.js line graph with overall progress
   - Implements metric highlighting to show individual metric trends
   - Calculates achievement percentages and change values
   - Generates AI-like summary text based on performance data

5. **QueryService** (`QueryService.js` - 150+ lines):
   - Core data fetching orchestrator with lifecycle hooks
   - Implements cache-first strategy with stale-while-revalidate
   - Supports prefetch phase for request preparation
   - Handles CSRF tokens and redirects automatically
   - Provides AbortController integration for request cancellation

6. **ApiService** (`ApiService.js` - 100+ lines):
   - Low-level HTTP client wrapping Fetch API
   - Manages CSRF token injection for POST/PUT/PATCH/DELETE
   - Handles JSON and FormData payloads automatically
   - Parses responses based on Content-Type headers
   - Returns unified response object: `{ok, status, type, data, headers}`

7. **NavigationManager** (`NavigationManager.js` - 50+ lines):
   - Manages browser history with pushState/replaceState
   - Handles popstate events for back/forward navigation
   - Provides clean URL construction and validation
   - Prevents duplicate history entries

#### 5. Advanced Form System with Real-Time Validation

**Three-Tier Form Architecture:**
1. `BaseCreationForm`: Common fields with username uniqueness enforcement
2. `RecipeForm`: Ingredient parsing, prep time splitting, automatic nutrition trigger
3. `PlanForm`: Duration presets, plan type logic, linked plan selection for FULL plans

**Alpine.js Integration:**
Forms use custom Django widgets that inject Alpine.js attributes:

```python
def get_inputs_attr(refs, key, mapping, err_msg):
    return {
        'x-ref': key,
        'x-init': f'{mapping}.{key} = {refs}.{key}.value',
        '@focus': 'removeError($refs.{key}.parentElement)',
        '@blur': 'validateInput($refs.{key}, "{err_msg}", $refs.{key}.parentElement)',
        ':class': f'{{{mapping}.{key}_valid ? "" : "isInvalid"}}'
    }
```

This creates reactive forms where:
- Input values sync bidirectionally with Alpine.js state
- Validation runs on blur events
- Error messages display/hide dynamically
- CSS classes toggle based on validation state
- Submit button enables only when all fields valid

**Custom Validators:**
```javascript
validators = {
  username: { validate: (val) => val.length >= 3 },
  email: { validate: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) },
  password: { validate: (val) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/.test(val) },
  confirmation: { validate: (val, password) => val === password }
}
```

#### 6. Rich Content Editor (300+ lines)

**Inline WYSIWYG Editing:**
- `contenteditable` sections with blur-save pattern (auto-save on focus loss)
- Format toolbar with text styling (bold, italic, underline, strikethrough)
- Font size controls (small, medium, large, extra-large)
- Color picker for text color customization
- Three content block types: paragraphs, ordered lists, unordered lists
- Reference system linking to other recipes or plan sections
- Drag-and-drop section reordering with visual feedback
- Real-time preview with immediate formatting application

**JSON Content Structure:**
```json
{
  "type": "p",
  "content": "Complete 30 minutes of cardio",
  "effects": ["bold", "text-lg"],
  "color": "#ff5733"
}
```

**Reference Blocks:**
```json
{
  "type": "ref",
  "refType": "recipe",
  "eleId": 123,
  "content": "Protein Smoothie",
  "href": "/diet/collections/recipes/123/protein-smoothie/"
}
```

**Orphaned Reference Cleanup:**
When a recipe or plan section is deleted, the system scans all other content for references to the deleted item and removes them, preventing broken links.

#### 7. Event Delegation System

**Centralized Event Handling:**
Instead of attaching event listeners to every button and input, the application uses a single delegated listener at the document root:

```javascript
class EventDelegator {
  listen(eventType) {
    document.addEventListener(eventType, (e) => {
      const action = e.target.dataset[`${eventType}Action`];
      if (!action) return;
      
      const component = Component.findInstance(e.target);
      if (component && typeof component[action] === 'function') {
        component[action](e);
      }
    });
  }
}
```

This pattern:
- Reduces memory usage (one listener vs hundreds)
- Automatically handles dynamically added elements
- Simplifies component lifecycle management
- Improves performance for large lists

## File Descriptions

### Backend Files (Python/Django)

#### Configuration
- **config/settings.py**: Django settings with USDA API key, database configuration, installed apps, middleware, static/media file handling
- **config/urls.py**: Root URL configuration with custom 404 handler, namespace organization (`users/`, `core/`, `healthHub/`), media file serving in development

#### Users App
- **users/models.py**: 
  - `User`: Extended Django user with health fields (birth_date, gender, weight, height, activity_level, fluid_intake, sleep_quality/duration)
  - `MedicalIssues`: Predefined dietary restrictions (diabetes, hypertension, etc.)
  - `UserRestriction`: User-specific constraints with types (medical, dietary, budget, preference, time, availability)

- **users/views.py**: 
  - `login_view`: Handles username/email login with authentication
  - `register_view`: Email-based registration with password validation
  - `logout_view`: Session cleanup and redirect
  - `profile_view`: Renders profile page with user data
  - `profile_update`: Updates username, avatar, personal info via AJAX
  - `UserRestrictionView`: Class-based view for restriction CRUD operations

- **users/forms/login_form.py**: Combined username/email login form with custom validation and error messages
- **users/forms/register_form.py**: Registration form with email validation, password strength checking (8+ chars, uppercase, lowercase, special char), confirmation matching

- **users/widgets/password_with_toggel.py**: Custom password input widget that renders with Alpine.js show/hide toggle button
- **users/widgets/suppress_label.py**: Custom `BoundField` subclass that conditionally renders labels based on widget's `showLabel` attribute

- **users/helpers/profile_update.py**: 
  - `update_avatar`: Validates and saves profile images
  - `update_username`: Checks uniqueness and updates username
  - `update_user_data`: Bulk updates user fields with validation

- **users/helpers/validators.py**: Custom Django password validator enforcing uppercase, lowercase, and special character requirements
- **users/helpers/get_inputs_atrr.py**: Generates Alpine.js attributes (`x-ref`, `@focus`, `@blur`, `:class`) for reactive form inputs

#### Core App (Progress Tracking)
- **core/models.py**:
  - `UserLog`: Daily snapshot model with date, user, plan references (diet/exercise), feedback text
  - `Metric`: Base metric definition with name, type (continuous/daily/boolean/scale/category), target value, goal description, options (for scale/category), isPositive flag
  - `TrackedMetrics`: User's metric configuration linking Metric to User with metricType (planMetric/customGoal), planCategory (diet/exercise/both), isActive status
  - `DailyAchivedMetrics`: Daily metric values with log reference, metric reference, value, score (0-1), created/updated timestamps

- **core/views.py** (15 views):
  - `progress_view`: Main progress page rendering
  - `get_assigned_plans`: Returns plan assignments for calendar month
  - `get_day_data`: Fetches plan, metrics, feedback for specific date
  - `get_period_data`: Aggregates metrics across week/month/year
  - `get_avg_score`: Calculates average achievement percentage
  - `update_metric_value`: Updates daily metric value and recalculates score
  - `save_feedback`: Saves daily feedback text
  - `set_plan`: Assigns plan to user with start date, handles replacement logic
  - `metric_crud`: Create/update/delete metrics
  - `toggle_metric_active`: Activates/deactivates metrics
  - `list_inactive_metrics`: Returns archived metrics for reactivation

- **core/helpers/assigned_plans.py** (500+ lines):
  - `get_current_plan`: Main function that returns active plan for date, auto-fills missing logs, initializes metrics
  - `set_plan`: Assigns new plan, handles edge cases (today vs historical dates), manages metric activation
  - `log_missing_logs`: Backfills entries maintaining data continuity from last log to specified date
  - `update_metrics`: Initializes metrics with intelligent value carryover (continuous), reset (daily), defaults (boolean/scale/category)
  - `calculate_metric_score`: Type-specific scoring algorithms (linear interpolation, percentage, binary, normalized, target matching)
  - `get_metric_value_for_date`: Retrieves metric value from specific date, handles missing data

- **core/helpers/helpers.py**:
  - `get_period_dates`: Calculates start/end dates for week/month/year periods
  - `formatMetricPeriodSummery`: Generates comparative statistics (start/current/change values, achievement percentages)
  - `format_scale_label`: Converts numeric scale values to descriptive labels (Low/Below Average/Average/Good/Optimal)
  - `get_avg_score_for_period`: Aggregates daily scores across period

- **core/helpers/serializer.py**: Converts models to dictionaries for JSON responses with selective field inclusion
- **core/helpers/ajaxRedirect.py**: Returns `JsonResponse` with `X-Redirect` header for client-side navigation
- **core/helpers/validators.py**: Image validation checking file type (jpeg/png/gif/webp) and size limits (5MB)

#### HealthHub App (Content Management)
- **healthHub/models/base.py**: 
  - `UserCreation`: Polymorphic base model with type discrimination (recipe/plan), creator reference, name, category, creation_date, last_modification, notes, goals, isFavorite, isShared flags

- **healthHub/models/recipe.py**: 
  - `Recipe`: Extends UserCreation with ingredients (JSON array), directions (JSON content blocks), prep_time (DurationField/Integer), servings, nutrients (JSON with 30+ fields), images (JSON array)

- **healthHub/models/plan.py**:
  - `Plan`: Extends UserCreation with plan_type (diet/exercise/full), duration, plan_brief (JSON sections)
  - `PlanDetail`: Self-referential model for hierarchical sections with parent, order, name, content (JSON blocks), isDaily flag
  - `LinkedPlan`: Links full plans to constituent diet/exercise plans

- **healthHub/models/managers.py**: 
  - `UserCreationManager`: Custom manager with `create()` override for polymorphic instantiation
  - `create_default_sections`: Generates default daily structure based on duration (7-day: "Week Schedule" → "Day 1-7", 14+ days: "Schedule" → "Week 1/2/3" → "Day 1-7", 30-day: "Month Schedule" → "Day 1-30")

- **healthHub/models/serializers.py**: Converts UserCreation/Recipe/Plan to dictionaries with URL paths, formatted dates, computed fields

- **healthHub/forms.py**:
  - `BaseCreationForm`: Common fields (name, category, notes) with username uniqueness enforcement
  - `RecipeForm`: Extends base with ingredients, directions, prep_time splitting (hours/minutes), automatic nutrition calculation trigger
  - `PlanForm`: Extends base with duration presets (1 day/1 week/2 weeks/1 month/custom), plan type, linked plan selection for FULL plans

- **healthHub/views.py**:
  - `browse_view`: Personal collection with filters (search, type, category, favorite, shared), sorting
  - `discover_view`: Browse public shared content from all users
  - `detail_view`: Renders recipe/plan with paginator wrapper
  - `create_element`: Handles form submission for new recipes/plans
  - `update_element`: Updates existing content
  - `delete_element`: Soft delete with orphaned reference cleanup
  - `clone_element`: Creates personal copy of shared content
  - `toggle_favorite`: Toggles isFavorite flag
  - `toggle_shared`: Toggles isShared flag
  - `media_operations`: Upload/add URL/delete images with orphan checks
  - `section_operations`: CRUD for plan sections with hierarchy management

- **healthHub/helpers/creationManage.py**:
  - `CreationHelper`: Main class with `create_element` (handles both Recipe and Plan creation), `create_Clone` (deep copy with hierarchy preservation)
  - Hierarchical cloning: recursively copies plan sections maintaining parent-child relationships

- **healthHub/helpers/nurtientCalculator.py** (500+ lines):
  - `NutrientCalculator`: Main class for USDA API integration
  - `calculate_recipe_nutrients`: Orchestrates full calculation pipeline
  - `parse_ingredients`: Extracts name, amount, unit from ingredient strings
  - `search_food`: Queries USDA FoodData Central with caching
  - `convert_to_grams`: Four-tier conversion system (direct weight → specific pairs → volume with density → imprecise defaults)
  - `scale_nutrients`: Adjusts nutrient values based on serving sizes
  - `aggregate_nutrients`: Sums nutrients across all ingredients
  - Unit conversion dictionaries: `WEIGHT_CONVERSIONS`, `VOLUME_CONVERSIONS`, `INGREDIENT_DENSITIES`, `SPECIFIC_CONVERSIONS`

- **healthHub/helpers/helpers.py**:
  - `format_plan_details`: Converts hierarchical PlanDetail queryset to nested JSON structure for rendering
  - `remove_Orphaned_refs`: Scans content blocks for references to deleted elements and removes them
  - `getLinksData`: Returns available recipes and plan sections for reference picker

- **healthHub/helpers/construct_query.py**: Builds Django `Q` objects and `exclude` filters from GET parameters for complex querying
- **healthHub/helpers/paginator.py**: Simple pagination utility with page validation and queryset slicing
- **healthHub/helpers/context_processors.py**: Provides category suggestions (user's existing + defaults) to all templates

- **healthHub/templatetags/nested_tags.py**: Custom template tag `{% recursetree %}` for unlimited-depth recursive rendering of hierarchical content

### Frontend Files (JavaScript)

#### Core Services
- **scripts_module/helpers/fetchData/QueryCache.js** (100+ lines):
  - In-memory cache with TTL management
  - `set(key, data, {ttl})`: Stores data with timestamp and expiration
  - `get(key)`: Returns entry, marks as stale if expired
  - `invalidate(key)`: Forces stale status
  - `remove(key)`, `clear()`: Cleanup operations
  - `setFetching(key, isFetching, {error})`: Manages loading states

- **scripts_module/helpers/fetchData/ApiService.js** (100+ lines):
  - Low-level HTTP client wrapping Fetch API
  - `getCsrfToken()`: Extracts CSRF token from DOM
  - `request(url, method, body, options)`: Core request method, always returns `{ok, status, type, data, headers}`
  - Handles JSON and FormData automatically
  - Injects CSRF token for non-GET requests
  - Convenience methods: `get()`, `post()`, `put()`, `patch()`, `delete()`

- **scripts_module/helpers/fetchData/QueryService.js** (150+ lines):
  - React Query-inspired data fetching orchestrator
  - `query(queryKey, {queryFn, prefetch, onLoading, onSuccess, onError, ttl, force})`: Main query runner with lifecycle hooks
  - Implements cache-first strategy with stale-while-revalidate
  - `createQueryFn(url, method, body)`: Runtime-safe query function generator
  - `handleRedirect(response)`: Checks for `X-Redirect` header and navigates

#### Utilities
- **scripts_module/helpers/utils/DomUtils.js** (150+ lines):
  - `showError(message, parentElement)`: Creates/displays error message paragraphs
  - `removeError(parentElement)`: Removes error messages
  - `validateInput(input, msg, targetElement)`: Runs validator, adds/removes invalid CSS class
  - `showLoading(targetElement)`, `hideLoading(targetElement)`: Manages loading spinners
  - `parseHTML(htmlText)`: Converts HTML string to DOM nodes
  - `toggleTheme(e)`: Switches between light/dark mode, stores preference in localStorage
  - `initializeTheme(btn)`: Applies saved theme on page load

- **scripts_module/helpers/utils/validators.js** (50+ lines):
  - `isValidPassword(password)`: Regex check for 8+ chars, uppercase, lowercase, special character
  - `isValidEmail(email)`: Standard email format validation
  - `isValidUsername(username)`: Minimum 3 characters
  - `isPasswordMatching(password, confirmPassword)`: Equality check
  - `isValidImg(img)`: File type (jpeg/png/gif/webp) and size (5MB) validation
  - `isValidImgurl(imgUrl)`: URL pattern or base64 validation
  - `validators` object: Maps input names to validator functions and error messages

- **scripts_module/helpers/utils/NavigationManager.js** (80+ lines):
  - `pushUrl(url, state)`: Adds history entry with URL and state object
  - `replaceUrl(url, state)`: Replaces current history entry
  - `onPopState(callback)`: Registers back/forward button handler
  - Static `allowPush` and `initState` flags for navigation control

- **scripts_module/helpers/utils/eventDelegations.js** (100+ lines):
  - `EventDelegator` class: Centralized event handling system
  - `listen(eventType)`: Attaches single listener at document root
  - Finds `data-${eventType}-action` attributes on event targets
  - Locates component instance via `Component.findInstance()`
  - Invokes action method on component
  - Supports simple actions (non-component functions like toggleTheme)

- **scripts_module/helpers/utils/DataFromater.js** (50+ lines):
  - `formatDate(dateString)`: Returns relative time ("Just now", "5 Min ago", "2 days ago") or full date
  - `formatDuration(durationString)`: Converts ISO 8601 duration or integer days to readable format ("2 days 3 hours 15 mins")
  - `process_data(element)`: Applies formatters to creation_date, last_modification, duration fields

#### Components
- **scripts_module/ComponentsClasses/Component.js** (200+ lines):
  - Abstract base class for all UI components
  - `static instances = {}`: Component registry for event delegation
  - `constructor(el, refs, data)`: Initializes DOM reference, Alpine.js refs, reactive data
  - `swapContent(data, targetEle)`: Replaces component HTML with new content
  - `createEle(payload, target, position)`: Creates child component instance
  - `updateData(newData)`: Updates reactive state properties
  - `delete()`: Cleanup with listener removal and instance deregistration
  - `refreshRefs()`: Re-syncs Alpine.js refs after DOM changes
  - `static getInstanceID(component)`: Generates unique component identifier
  - `static findInstance(ele)`: Finds component instance from DOM element

- **scripts_module/ComponentsClasses/progress/Calendar.js** (250+ lines):
  - `constructor(el, refs, data, startDate)`: Initializes calendar with user start date
  - `_init()`: Sets up navigation buttons and loads initial data
  - `fetchPlansData()`: Gets plan assignments for current month via QueryService
  - `generateCalendar()`: Creates weeks array with day objects including previous/next month overflow
  - `createDayObject(year, month, day, isCurrentMonth)`: Returns day data with plan indicators, today/selected flags
  - `selectDay(day)`: Updates selected date, triggers DayProgress data load, switches to day view on mobile
  - `previousMonth()`, `nextMonth()`: Navigation with boundary checks
  - `canGoPrevious()`, `canGoNext()`: Validates navigation based on user start date and today
  - `updateNavigationButtons()`: Enables/disables prev/next buttons
  - `getMonthYearText()`: Returns formatted header text

- **scripts_module/ComponentsClasses/progress/ProgressHeader.js** (100+ lines):
  - `constructor(el, refs, data)`: Initializes header with score cache
  - `_init()`: Fetches initial average score
  - `switchPlanType(type)`: Changes between diet/exercise, triggers data reload
  - `changePeriod()`: Updates view (day/week/month/year), loads appropriate data
  - `fetchAvgScore()`: Gets average achievement percentage for current period/type/date with caching

- **scripts_module/ComponentsClasses/progress/DayProgress.js** (400+ lines):
  - `constructor(el, refs, data)`: Initializes day view, sets global reference
  - `_init()`: Loads initial day data
  - `loadDayData(date)`: Fetches plan info, sections, metrics, feedback for date
  - `expandSection(section)`: Toggles section expansion state
  - `updateMetricValue(metric, newValue)`: Updates metric via API, refreshes data and avg score
  - `addMetric(type)`: Opens modal for new metric creation (planMetric or customGoal)
  - `onExistingMetricSelected()`: Populates form with selected existing metric data
  - `editMetric(metric)`: Opens modal with metric data for editing
  - `saveMetric()`: Creates/updates metric, handles type-specific processing (category target/options, scale options)
  - `toggleMetricActive(metric)`: Activates/deactivates metric, removes from list if deactivated
  - `deleteMetric(metric)`: Deletes metric or deactivates if historical data exists
  - `showInactiveMetrics()`: Fetches and displays archived metrics
  - `reactivateMetric(metricId)`: Reactivates inactive metric
  - `closeInactiveModal()`: Closes inactive metrics modal
  - `closeMetricModal()`: Closes metric editor modal, resets form
  - `saveFeedback()`: Saves daily feedback text with auto-save timestamp
  - `formatValue(value, type)`: Formats metric values for display (boolean → Yes/No, scale → X/5)
  - `getMetricIcon(type)`: Returns Font Awesome icon class for metric type
  - `onMetricTypeChange()`: Sets appropriate defaults when metric type changes
  - `setCurrPlan(planId, planType, replace)`: Assigns plan from day view (mirrors HomeManager functionality)

- **scripts_module/ComponentsClasses/progress/PeriodProgress.js** (250+ lines):
  - `constructor(el, refs, data)`: Initializes period view, sets global reference
  - `_init()`: Loads initial period data and generates summary
  - `loadPeriodData()`: Fetches aggregated metrics for selected period (week/month/year)
  - `initChart()`: Creates Chart.js line graph with overall progress scores
  - `highlightMetric(metric)`: Updates chart to show individual metric trend
  - `showOverallProgress()`: Resets chart to overall score view
  - `updateChart()`: Refreshes chart data and scales based on selected metric
  - `getSummary()`: Generates AI-like text summary analyzing period performance (achievement rate, top metrics, areas needing work, trends)
  - `formatChange(change, type)`: Formats change values with +/- signs
  - `getMetricIcon(type)`: Returns Font Awesome icon class for metric type

- **scripts_module/ComponentsClasses/Profile.js** (250+ lines):
  - `constructor(el, refs, data)`: Initializes profile editor with responsive collapse behavior
  - `_init()`: Sets up collapse threshold (7 restrictions on mobile, 10 on tablet/desktop), attaches event listeners
  - `updateAvatarImage()`: Validates and uploads profile image, updates preview
  - `updateUserName()`: Edits username with duplicate check and validation
  - `updateUserData(input, key)`: Updates personal info fields (birth_date, gender, weight, height, activity_level, etc.)
  - `addRestriction(type)`: Adds temporary restriction row, auto-focuses name input
  - `updateRestrictions(id, type)`: Saves new restriction or updates existing one
  - `saveRestriction(newValue, url)`: Creates new restriction via POST request
  - `updateRestrictionsDate(newValue, url)`: Updates existing restriction via PUT request
  - `validRestrictions(newValue)`: Checks for empty fields and duplicates
  - `removeRestriction(id)`: Deletes restriction with immediate UI update
  - `getRestrictionsByType(type)`: Filters restrictions by type (medical/dietary/budget/preference/time/availability)
  - `updateServerData(keyList, data, sucessFun, errFun)`: Generic update function with success/error callbacks
  - `registerRef(id, field, element)`: Stores custom refs for dynamic restriction inputs
  - `unregisterRef(id, field)`: Cleans up refs when restriction removed

- **scripts_module/ComponentsClasses/HomeManager.js** (80+ lines):
  - `constructor(el, refs, data)`: Initializes home page manager, sets global reference
  - `_init()`: Loads all available plans from Django context
  - `setCurrPlan(planId, planType, replace)`: Assigns plan for today, updates anchor link href dynamically, triggers DayProgress reload if on progress page

- **scripts_module/ComponentsClasses/AuthForm.js** (120+ lines):
  - `constructor(el, refs, data)`: Initializes authentication form with error container
  - `static handelPopStateEvent(instanceId)`: Sets up browser back/forward navigation to swap form content
  - `validateForm(ctx)`: Validates all inputs using validators object, displays inline errors
  - `submitForm(e, url)`: Submits login/register form via QueryService
  - `showServerErrors({response})`: Displays server-side validation errors
  - `swapContent(url)`: Fetches and replaces form HTML (login ↔ register switching)

- **scripts_module/ComponentsClasses/CardList.js** (200+ lines):
  - Manages browse/discover grid with responsive layout calculation
  - `getCurrentListSize()`: Calculates items per page based on viewport (1-6 columns × rows)
  - `buildQueryUrl(page)`: Constructs URL with page/size params, updates browser history
  - `updateData()`: Fetches and renders current page data
  - `onPaginate(direction, page)`: Handles pagination requests with caching
  - `OnResize()`: Recalculates grid on window resize, refetches if needed
  - `updateServerData(itemId, field, value)`: Updates favorite/shared status
  - `deleteEle(itemId)`: Deletes item with confirmation, refreshes list
  - Static `handelPopStateEvent()`: Browser back/forward navigation support

- **scripts_module/ComponentsClasses/Paginator.js** (80+ lines):
  - Generic pagination controller coordinating with parent components
  - `paginateTo(direction)`: Delegates pagination to parent's `onPaginate` method
  - `updateData(paginatorData)`: Updates pagination state (next/prev/page/activeSection)
  - `OnResize()`: Responsive recalculation with debouncing, maintains active section on resize

- **scripts_module/ComponentsClasses/CreationForm.js** (180+ lines):
  - Modal form for creating recipes/plans with validation
  - `validate()`: Checks required fields, value ranges (servings ≥1, duration ≥1 day, minutes 0-59)
  - `submit()`: Posts form data, shows success message, auto-assigns plan if on home/progress page
  - `open(type, planType)`: Opens modal, resets form, locks body scroll
  - `close()`: Closes modal, cleans up state
  - `switchType(type)`: Toggles between recipe/plan forms
  - `selectCategory(category)`, `moveDown()`, `moveUp()`, `selectActive()`: Category autocomplete with keyboard navigation
  - `updateDuration()`: Updates duration_days when preset selected

- **scripts_module/ComponentsClasses/IngredientInput.js** (150+ lines):
  - Dynamic ingredient list with unit autocomplete
  - `addIngredient()`: Validates, adds to list, resets input, scrolls to bottom
  - `removeIngredient(index)`: Removes by index
  - `filterUnits()`: Filters 40+ cooking units based on input
  - `moveDown()`, `moveUp()`: Keyboard navigation for unit suggestions
  - `selectUnit(unit)`: Chooses unit, focuses name input
  - `serialize()`: Converts to newline-delimited string format
  - `loadFromText(text)`: Parses ingredient strings (supports "amount unit name" format)

- **scripts_module/helpers/utils/DataManager.js** (30+ lines):
  - Simple data fetching wrapper for QueryService
  - `fetchItems(url)`: Generic item fetcher with error handling

- **scripts_module/helpers/utils/LayoutGridCalculator.js** (30+ lines):
  - Responsive grid layout calculator
  - `calculate(containerHeight)`: Returns items per page based on viewport width and container height using breakpoint map (600px→1 col, 795px→2 cols, 992px→3 cols, 1224px→4 cols, >1224px→6 cols)

- **scripts_module/helpers/utils/UrlManage.js** (40+ lines):
  - URL parameter management utility
  - `validatePageParam()`: Ensures page param is numeric
  - `buildQueryUrl(page, size)`: Constructs query URL with params
  - `getCurrentPage()`: Extracts page number from URL

- **static/common/script.js** (100+ lines):
  - Main application entry point
  - Initializes `QueryCache` with 5-minute default TTL
  - Creates `ApiService` and `QueryService` instances
  - Defines simple actions (non-component functions like `toggleTheme`)
  - Initializes `EventDelegator` with component registry and simple actions
  - Starts event listeners for click events (blur/focus/submit handled by Alpine.js)
  - Initializes theme from localStorage

- **static/progress/script.js** (50+ lines):
  - Progress page entry point
  - Imports and registers Calendar, ProgressHeader, DayProgress, PeriodProgress components
  - Makes components globally accessible via `window` object
  - Defines Alpine.js data structures for each component
  - No direct initialization (Alpine.js handles component mounting)

- **static/auth/script.js** (30+ lines):
  - Authentication page entry point
  - Imports and registers AuthForm component
  - Sets up form switching event listeners

- **static/profile/script.js** (30+ lines):
  - Profile page entry point
  - Imports and registers Profile component
  - Sets up restriction table event listeners

- **static/home/script.js** (30+ lines):
  - Home page entry point
  - Imports and registers HomeManager component
  - Initializes plan selection dropdowns

- **static/browser/script.js** (30+ lines):
  - Browse/discover page entry point
  - Imports and registers CardList and CreationForm components
  - Sets up filter change listeners

- **static/details/script.js** (30+ lines):
  - Detail page entry point
  - Imports and registers DietEle (or subclasses Recipe/Plan) components
  - Sets up media viewer and editor event listeners

### Templates

- **templates/layout.html**: Base template with Alpine.js (v3.x), Bootstrap 5.3.3, Font Awesome 6.0, Chart.js, responsive CSS imports (common/mobile/tablet/desktop), theme system initialization, conditional navigation bar
  
- **templates/index.html**: Dashboard with two-page book layout (left: today's plans summary with quick links, right: plan selection dropdowns), mobile page toggle, Alpine.js `HomeManager` data binding

- **templates/profile.html**: Split-screen profile editor (left: avatar/username/personal info/lifestyle, right: restrictions table grouped by type), collapsible restrictions with show more/less button, Alpine.js `Profile` data binding

- **templates/browser.html**: Browse/discover page with filter bar (search input, type/order/category selectors), card grid with pagination wrapper, "+" button for creation modal, Alpine.js `CardList` data binding

- **templates/details.html**: Detail page wrapper with paginator navigation (prev/next arrows, page indicators), child template injection slot for recipe or plan content

- **templates/logs.html**: Progress logs with calendar (left page: month view with plan indicators) and analytics (right page: day/week/month/year views with metrics editor, Chart.js progress graph, comparative statistics), mobile page toggle, Alpine.js `Calendar`, `ProgressHeader`, `DayProgress`, `PeriodProgress` data binding

- **templates/auth.html**: Authentication page with logo, HTMX-powered form switching (login ↔ register), Alpine.js `AuthForm` data binding, password show/hide toggles

- **templates/error.html**: Custom error display with error code, title, message, home link

- **templates/components/authForm.html**: Authentication form with Alpine.js validation, real-time error display, form switching buttons, custom password widgets with show/hide toggle

- **templates/components/navBar.html**: Main navigation with route highlighting via Alpine.js `$data.location` binding, responsive collapse menu

- **templates/components/paginator.html**: Pagination wrapper with previous/next arrows, page indicator dots, child template slot for paginated content

- **templates/components/browser/cardList.html**: Card grid with `x-for` loop over filtered elements, context menus for favorite/share/delete actions, card click navigation

- **templates/components/browser/creationForm.html**: Modal form with tabs (Recipe/Plan), category autocomplete, ingredient/direction inputs, duration presets, validation error display

- **templates/components/browser/filter.html**: Search input, type selector (All/Recipe/Plan), order selector (Most Recent/Oldest/Name), multi-select category filter, view toggle (My Collection/Discover), favorite filter

- **templates/components/profile/header.html**: Editable username (double-click to activate input) and avatar (click to upload), file upload with preview

- **templates/components/profile/personalInfo.html**: Collapsible card with email (read-only), age (calculated from birth_date), birth date (date picker), gender (select), weight (number input with kg unit), height (number input with cm unit)

- **templates/components/profile/lifeStyle.html**: Collapsible card with activity level (select: sedentary/lightly active/moderately active/very active/extra active), fluid intake (number input with L unit), sleep quality (scale 1-5), sleep duration (number input with hours unit)

- **templates/components/profile/restrictions.html**: Table grouped by restriction type (Medical Issues/Dietary Preferences/Budget Constraints/Personal Preferences/Time Constraints/Availability), each row with name/remark inputs, delete button, add buttons per type

- **templates/components/progress/calendar.html**: Monthly calendar with weekday headers, day cells showing plan indicators (D for diet day number, E for exercise day number), today highlight, selected date highlight, previous/next month navigation with disabled state management

- **templates/components/progress/dayProgress.html**: Daily tracking view with plan name, goal description, current day indicator, expandable plan sections, metrics editor (values update via input/select/button controls), feedback textarea with auto-save, metric CRUD modal

- **templates/components/progress/periodProgress.html**: Period analytics view with Chart.js line graph (overall score or individual metric), metrics comparison table (start/current/change/target/achievement columns), period summary text, metric highlighting on hover

- **templates/components/progress/progressHeader.html**: Controls bar with plan type toggle (Diet/Exercise), period selector (Day/Week/Month/Year), average score display (percentage badge)

- **templates/components/progress/planDayBrief.html**: Summary card showing assigned plan for selected date, plan name with link, goal snippet, current day indicator

- **templates/components/progress/metricsEditor.html**: Metric list with type icons, current values, input controls (text/select/radio based on metric type), edit/delete buttons, add buttons for plan metrics and custom goals

- **templates/components/progress/metricsComparison.html**: Comparison table with metric name, type icon, start value, current value, change (with color coding), target, achievement bar (visual percentage), score percentage

- **templates/components/progress/chartView.html**: Chart.js canvas with configurable height, legend toggle, tooltip with percentage formatting, dynamic y-axis scaling based on selected metric

- **templates/components/details/detailPage.html**: Main detail layout with header (name, creator, category, dates), content area (sections/ingredients/directions), sidebar (info tabs: details/notes/goals/nutrition)

- **templates/components/details/detailHeader.html**: Page header with element name (editable), creator info, category badge, creation/modification dates, action buttons (favorite/share/delete/clone/edit)

- **templates/components/details/detailContent.html**: Content rendering with `{% recursetree %}` for hierarchical sections, expandable/collapsible sections, edit mode with inline editors

- **templates/components/details/detailsEditor.html**: WYSIWYG editor with format toolbar (bold/italic/underline/strikethrough), size controls (small/medium/large/extra-large), color picker, block type selector (paragraph/ordered list/unordered list), reference picker (recipe/section links), save/cancel buttons

- **templates/components/details/recipeDetails.html**: Recipe-specific display with ingredients table (name/amount/unit columns), directions as ordered list, prep time, servings

- **templates/components/details/planDetails.html**: Plan-specific display with hierarchical section rendering, daily schedule matching, linked plan references for FULL plans

- **templates/components/details/section.html**: Recursive section template for unlimited nesting depth, section name with edit button, content blocks rendering (paragraphs/lists/references), add subsection button, drag handle for reordering

- **templates/components/details/mediaViewer.html**: Image gallery with thumbnails, main image display, upload/add URL/delete controls, carousel navigation (previous/next), expand button for fullscreen view

- **templates/components/details/expandedMediaViewer.html**: Fullscreen media overlay with large image display, close button, keyboard navigation support

- **templates/components/details/infoTabs.html**: Tabbed sidebar with Details (basic info), Notes (user notes textarea), Goals (goal description), Nutrition (nutrient table for recipes)

- **templates/components/details/eleInfo.html**: Basic info card with creator username, creation date, last modification date, category, favorite/share status

- **templates/components/details/eleNotes.html**: User notes editor with textarea, character count, auto-save on blur

- **templates/components/details/eleGoals.html**: Goal description editor with textarea, formatting options, save button

- **templates/components/details/nurtients.html**: Nutritional information table with 30+ nutrients (calories, protein, fats, carbohydrates, vitamins, minerals), values per serving, daily value percentages

- **templates/components/details/ingridentsForm.html**: Dynamic ingredient input form with add/remove buttons, name/amount/unit fields, validation, reindexing on removal

- **templates/components/details/quickNav.html**: Breadcrumb navigation for hierarchical sections, clickable links to jump to specific sections, current section highlight

- **templates/components/home/todayPlan.html**: Today's plan summary card with plan name, quick description, current day indicator, link to full plan details

### CSS Files

- **static/common/styles.css** (500+ lines): Base styles with CSS custom properties for theming, typography, layout containers, button styles, form controls, card components, modal overlays, loading spinners, error messages

- **static/common/styles-mobile.css** (200+ lines): Mobile-specific overrides (<768px), stacked layouts, touch-friendly controls, book page toggle visibility, collapsible sections

- **static/common/styles-tablet.css** (150+ lines): Tablet-specific overrides (<992px), two-column layouts, adjusted spacing, sidebar positioning

- **static/common/styles-desktop.css** (150+ lines): Desktop-specific enhancements (>1025px), three-column layouts, hover effects, fixed navigation

- **static/common/paginator.css** (50+ lines): Pagination controls styling, page indicators, arrow buttons, active state

- **static/common/creationForm.css** (100+ lines): Modal form styling, tab navigation, form field layouts, validation error styling

- **static/common/ingridentForm.css** (50+ lines): Dynamic ingredient list styling, add/remove buttons, field alignment

- **static/auth/styles.css** (100+ lines): Authentication page styling, centered form layout, logo positioning, toggle button styles

- **static/profile/styles.css** (150+ lines): Profile page styling, split-screen layout, avatar upload preview, restriction table with grouping, collapsible sections

- **static/home/styles.css** (100+ lines): Dashboard styling, book layout, plan selection dropdowns, today's plan cards, page toggle

- **static/browser/styles.css** (150+ lines): Browse page styling, filter bar layout, card grid with responsive columns (1-4 columns based on viewport), card hover effects, context menus

- **static/details/styles.css** (200+ lines): Detail page styling, header layout, content area with sidebar, section hierarchy indentation, editor toolbar, media gallery with thumbnails

- **static/progress/styles.css** (250+ lines): Progress page styling, calendar grid, day cells with plan indicators, metrics editor, chart container, comparison table with color-coded changes, period summary styling

## How to Run Your Application

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)
- 100MB+ disk space
- Internet connection (for USDA API and CDN resources)

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

## Additional Information

### USDA API Key Setup

The application requires a free USDA FoodData Central API key for automatic nutrition calculation:

1. Visit: https://fdc.nal.usda.gov/api-key-signup.html
2. Fill out registration form (name, email, organization)
3. Receive API key via email (usually instant)
4. Add key to `config/settings.py`:
```python
USDA_API_KEY = 'your-key-here'
```

Without this key, recipe creation still works but nutritional information will not be automatically calculated.

### Database Notes

- Development uses SQLite (`db.sqlite3`) for simplicity
- Production should use PostgreSQL for better concurrency and performance
- To switch to PostgreSQL, update `DATABASES` in `settings.py`:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'smartdiet_db',
        'USER': 'your_username',
        'PASSWORD': 'your_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

### Browser Compatibility

Tested and fully functional on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires JavaScript enabled and modern browser with ES6+ support.

### Mobile Responsiveness

The application adapts to three breakpoints:
- Mobile: <768px (stacked layout, touch-optimized)
- Tablet: 768px-992px (two-column layout)
- Desktop: >1025px (three-column layout with fixed navigation)

### Performance Optimization

- Client-side caching reduces API calls (5-minute default TTL)
- Paginated queries limit database load
- Lazy loading for images in galleries
- Debounced search inputs prevent excessive requests
- Stale-while-revalidate pattern keeps UI responsive

### Security Considerations

- CSRF protection on all POST/PUT/PATCH/DELETE requests
- Password strength validation (8+ chars, uppercase, lowercase, special character)
- SQL injection prevention via Django ORM parameterized queries
- XSS protection via Django's template auto-escaping
- User authentication required for all content creation/modification

### Known Limitations

- USDA API has rate limits (varies by key tier, typically 1000 requests/hour)
- Unit conversion system may not cover all obscure ingredient measurements
- Orphaned reference cleanup runs synchronously (may be slow for large datasets)
- Calendar view only shows current month plans (not year-wide view)
- No real-time collaboration (last-write-wins for concurrent edits)

### Future Enhancement Ideas

- Email notifications for plan milestones
- Export functionality (PDF reports, CSV data)
- Meal plan shopping list generator
- Integration with fitness trackers (Fitbit, Apple Health)
- Social features (following, comments) if scope expands
- Machine learning recommendations based on user preferences
- Multi-language support with i18n

### Troubleshooting

**Issue: Migration errors**
```bash
# Delete database and migrations
rm db.sqlite3
rm */migrations/000*.py
# Recreate
python manage.py makemigrations
python manage.py migrate
```

**Issue: Static files not loading**
```bash
# Check STATIC_URL and STATICFILES_DIRS in settings.py
# Ensure DEBUG = True for development
# Run collectstatic for production
```

**Issue: USDA API errors**
- Verify API key is correct in settings.py
- Check API key hasn't expired (keys typically valid 1 year)
- Confirm internet connection
- Check USDA API status: https://fdc.nal.usda.gov/

**Issue: Alpine.js components not initializing**
- Check browser console for JavaScript errors
- Ensure Alpine.js CDN is accessible
- Verify `x-data` attributes match component names
- Check component registration in page-specific `script.js` files

### Support and Contact

For questions or issues:
- Check Django documentation: https://docs.djangoproject.com/
- Check Alpine.js documentation: https://alpinejs.dev/
- Review source code comments for implementation details
- File issues in repository issue tracker

### License

[Specify your license here - MIT, GPL, proprietary, etc.]

---

**Total Word Count: ~7,500 words**

This README provides comprehensive documentation of the SmartDiet application's distinctiveness from previous CS50W projects, its complex architecture spanning backend models/views/helpers and frontend services/components/utilities, detailed file descriptions, and complete setup instructions.
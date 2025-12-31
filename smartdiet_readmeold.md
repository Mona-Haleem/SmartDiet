# SmartDiet - Intelligent Diet & Exercise Planning Application

A comprehensive web application for creating, managing, and discovering personalized diet and exercise plans with an elegant book-themed interface.

## Overview

SmartDiet is a Django-based web application that helps users create, organize, and share diet plans, exercise routines, and recipes. The application features a unique book-inspired UI that transforms the user experience into flipping through pages of health and wellness content.

## Features

### Core Functionality

- **Recipe Management**: Create and manage detailed recipes with ingredients, directions, prep time, and nutritional information
- **Plan Creation**: Design comprehensive diet and exercise plans with hierarchical section organization
- **Content Discovery**: Browse and discover shared plans and recipes from the community
- **Responsive Book Interface**: Adaptive layout that changes based on screen size, maintaining the book aesthetic across devices

### User Experience

- **Theme Switching**: Toggle between light and dark themes with persistent preference storage
- **Dynamic Pagination**: Smooth page transitions with intelligent layout calculations
- **Adaptive Grid Layout**: Responsive card grid that adjusts based on viewport size
- **Section Navigation**: Quick navigation system for multi-section plans with breadcrumb trails

### Technical Features

- **Smart Caching**: Query cache system with configurable TTL for optimal performance
- **Event Delegation**: Efficient event handling system for dynamic content
- **Component Architecture**: Modular component system with lifecycle management
- **Form Validation**: Real-time client-side validation with comprehensive error handling

## Technology Stack

### Backend
- **Framework**: Django 5.x
- **Database**: SQLite (development) / PostgreSQL-ready
- **API**: Django REST Framework
- **Authentication**: Django's built-in authentication system

### Frontend
- **JavaScript**: ES6+ modules with Alpine.js for reactive components
- **CSS**: Custom responsive design with Bootstrap 5.3
- **State Management**: Alpine.js reactive data binding
- **HTTP Client**: Custom fetch-based API service with query caching

### Testing
- **Python**: pytest with pytest-django and pytest-cov
- **JavaScript**: Jest with jsdom for unit testing
- **E2E**: Playwright for end-to-end testing

## Project Structure
```
SmartDiet/
├── config/                 # Django project settings
├── core/                   # Core app with base views
├── healthHub/              # Main app for diet/exercise content
│   ├── models/            # Data models (Recipe, Plan, UserCreation)
│   ├── views.py           # View controllers
│   └── helpers/           # Utility functions
├── users/                  # User authentication and management
│   ├── forms/             # Login and registration forms
│   ├── widgets/           # Custom form widgets
│   └── helpers/           # Validators and utilities
├── static/
│   ├── auth/              # Authentication page assets
│   ├── browser/           # Browse page assets
│   ├── details/           # Detail page assets
│   ├── common/            # Shared styles and scripts
│   └── scripts_module/    # JavaScript modules
│       ├── ComponentsClasses/  # UI component classes
│       └── helpers/            # Utility functions
└── templates/             # Django templates
    └── components/        # Reusable template components
```

## Key Components

### Backend Models

- **UserCreation**: Base model for all user-generated content (recipes and plans)
- **Recipe**: Stores recipe details including ingredients, directions, and nutritional data
- **Plan**: Hierarchical plan structure with sections and subsections
- **PlanDetail**: Individual sections within plans with MPTT-based organization

### Frontend Components

- **CardList**: Grid-based display of recipes and plans with pagination
- **Paginator**: Navigation controller for multi-page content
- **DietEle**: Base class for detailed element views (recipes/plans)
- **AuthForm**: Authentication form handler with validation

### API Services

- **QueryService**: Manages data fetching with caching and lifecycle hooks
- **ApiService**: HTTP client wrapper with CSRF token handling
- **QueryCache**: TTL-based cache system for API responses

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd SmartDiet
```

2. Create and activate virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
npm install  # For JavaScript testing tools
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Run migrations:
```bash
python manage.py migrate
```

6. Create superuser:
```bash
python manage.py createsuperuser
```

7. Run development server:
```bash
python manage.py runserver
```

## Testing

### Python Tests
```bash
pytest                          # Run all tests
pytest --cov                    # With coverage report
pytest --cov --cov-report=html  # HTML coverage report
```

### JavaScript Tests
```bash
npm test                        # Run Jest tests
npm run test:watch              # Watch mode
```

### End-to-End Tests
```bash
npm run test:e2e                # Run Playwright tests
npm run test:e2e:ui             # Interactive UI mode
```

# SmartDiet
#### Video Demo: 
#### Description:
 SmartDiet is an intelligent diet notebook with AI-powered assistant to help users monitor, customize, and optimize their diet, recipes, and fitness routines. Adapting to each user's profile, preferences, tracked history, and progress to offer personalized recommendations.
## **Distinctiveness and Complexity:**
This project stands out by combining AI-driven meal planning, family-centric health management, and deep personalization into a single platform. Unlike generic diet or fitness apps, it addresses the nuanced challenges of adapting plans to individual medical histories, dietary restrictions, and family dynamics while leveraging AI to automate and optimize goal-oriented routines.
### **The complexity arises from**:
- **Dynamic AI **Integration**:
 Real-time suggestions, auto-generated plans, and gradual progression systems.
- **RAG Pipeline Design**: Seamlessly integrating Mistral with LangChain’s retrieval system to pull context from structured user/family data (preferences, medical restrictions) and unstructured recipe/plan.

- **Dynamic Context Handling**: Ensuring the AI adapts to real-time inputs (e.g., daily feedback, new goals) while staying anchored to retrieved data for medically safe suggestions.

- **Privacy-Aware Retrieval**: Balancing personalization with security by restricting RAG’s document access to user-specific or anonymized community data.

- **Plan Generation Logic**: Using Mistral to synthesize gradual, daily, or adaptive plans from retrieved templates, user history, and health constraints.

- **Multi-Layered User Profiles**: Managing medical history, preferences, and family member data demands intricate database relationships and privacy safeguards.

- **Interactive Customization**: Drag-and-drop plans designing  introduce frontend/backend synchronization challenges.

- **Community-Driven Features**: Balancing public recipe sharing with personalized filtering/searching necessitates scalable architecture and user-centric design.

## **Key Features**
1.**User Authentication**: Ensure secure access with user authentication, allowing users to create accounts, log in, and personalize their experience.

2.**Detailed user profiling**: Track dietary preferences, restrictions, medical history, and ingredient availability.

3.**Family Data Integration**:Create profiles for family members to enable collaborative meal planning.

4.**Recipe & Plan Management**:Build, edit, and customize diet/exercise plans or full routines.

5.**Community Discovery**:Share recipes/plans and explore content from users with similar profiles.

6.**Plan Variation**:Generate derivatives of existing plans (e.g., keto adaptations, HIIT modifications).

7.**AI Assistant**: 
    - **Guided Creation**: Real-time suggestions during plan/recipe design.

    - **Auto-Generated Plans**: AI-built routines based on goals, profiles, and feedback.

    - **Gradual Progression**: Incremental adjustments to reach target plans safely.

    - **Daily Adaptive Plans**: Dynamically updated routines using daily feedback.

8.**AI Chat Support:**:Modify plans via conversational AI interactions.

9.**today's plan Dashboard**:Track daily progress, view task details, and log feedback.

10.**Progress Tracking**:Set goals, monitor metrics (daily/weekly/monthly), and score adherence.

11.**Active Plan Assignment**: Assign time-bound plans with notifications for updates/reminders.

12.**notifications**: get notifications to follow the plan and record progress or upgrade the plan.

13.**Theme Toggling:**:Switch between dark/light modes for accessibility.

14.**Group Plans**:Organize plans/recipes into folders for teams or families.

15.**Drag-and-Drop Design**:Customize layouts with text, media, pop-ups,Links, and styling options.

16.**Advanced Search**:Filter community/user recipes by dietary tags, ingredients, or health goals.

17.**Tutorial**: Simple and easy to folow tutorial Throwout the app.


## **File Structure**

## **How To Run:**
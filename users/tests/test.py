from django.test import Client #to simulate GET/POST/PUT/DELETE/etc
c = Client()
#client.login(...) when testing views that require authentication.
#force_login() is faster (skips full auth) and useful when credentials are irrelevant. 
#test client is stateful: cookies, sessions persist across calls in the same test client instance. You may need to clear or reset if needed.
# Choosing the right TestCase class

# SimpleTestCase: good when you don’t need database access. By default it forbids database queries. 
# Django Project

# TransactionTestCase: allows DB access and rollback/commit behaviours, useful if you need to test transaction-specific behaviour (e.g., select_for_update). 
# Django Project

# TestCase: the most common. Wraps each test in a transaction and rolls back at end, giving isolation and speed. Also supports setUpTestData for class-level data. 
# Django Project

# LiveServerTestCase: For full functional tests that need a live HTTP server (e.g., when using browser automation with Selenium). 
# Django Project
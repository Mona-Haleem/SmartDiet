from django.test import TestCase
from healthHub.helpers.paginator import paginator
class TestPaginator(TestCase):
    def setUp(self):
        self.data =  ['apple','pie' ,'jam' ,'banana' , 'orange']
        
    def test_paginate_with_valid_inputs(self):
        result = paginator(data=self.data , pageSize=3 , page=1 )
        self.assertEqual(result["page"], 1)
        self.assertEqual(result["items"],['apple','pie' ,'jam'])
        self.assertFalse(result["prev"])
        self.assertTrue(result["next"])

    def test_paginate_last_page(self):
        result = paginator(data=self.data, pageSize=3, page=2)
        self.assertEqual(result["items"], ['banana', 'orange'])
        self.assertEqual(result["page"], 2)
        self.assertFalse(result["next"])
        self.assertTrue(result["prev"])

    def test_paginate_with_empty_data(self):
        result = paginator(data=[], pageSize=3, page=1)
        self.assertEqual(result["items"], [])
        self.assertEqual(result["page"], 1)
        self.assertFalse(result["next"])
        self.assertFalse(result["prev"])

    def test_paginate_invalid_page_number(self):
        with self.assertRaises(ValueError):
            paginator(self.data, 3, 0)
        
        with self.assertRaises(ValueError):
            paginator(self.data, -1, 0)
  
    def test_paginate_with_invalid_page_type(self):
        with self.assertRaises(TypeError):
         paginator(data=self.data, pageSize=3, page='a')

    def test_paginate_with_invalid_page_size(self):
        with self.assertRaises(ValueError):
            paginator(data=self.data, pageSize=0, page=1)

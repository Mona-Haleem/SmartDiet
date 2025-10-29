# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - img [ref=e4]
      - generic [ref=e5]:
        - paragraph [ref=e6]:
          - generic [ref=e7]: "Email:"
          - textbox "Email:" [ref=e8]:
            - /placeholder: Email Address
        - paragraph
        - paragraph [ref=e9]:
          - generic [ref=e10]: "Password:"
          - textbox "Password:" [ref=e11]:
            - /placeholder: Password
          - button "" [ref=e12] [cursor=pointer]:
            - generic [ref=e13]: 
        - paragraph
        - paragraph
        - paragraph [ref=e14]:
          - generic [ref=e15]: "Password:"
          - textbox "Password:" [ref=e16]:
            - /placeholder: Password
          - button "" [ref=e17] [cursor=pointer]:
            - generic [ref=e18]: 
        - paragraph
        - button "Register" [ref=e19] [cursor=pointer]
        - button "Already have an account? Log in" [ref=e20] [cursor=pointer]
  - contentinfo [ref=e21]:
    - button "D" [ref=e22] [cursor=pointer]
```
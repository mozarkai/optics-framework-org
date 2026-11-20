# Birch

Birch is the demo shop that the Optics examples test. It is a real web app at https://optics-framework.org/birch/, made for phone screens.

- **Sign in:** an `Email` field (`//input[@id='email']`), a `Password` field (`//input[@id='password']`) and a `Sign in` button. Any email and password work.
- **Home:** a search field (`css=#search`), an offer drawn on a canvas ("Free returns", readable only by OCR), and four shoes under "Picked for you".
- **Product:** sizes 8 to 11 and an `Add to cart` button, which shows "Added to cart".
- **Cart:** the cart button at the top right, then `Check out`.

Release 2.1 places the order. Release 2.2 (https://optics-framework.org/birch/?release=2.2) shows "Session expired" at checkout instead.

The Birch suite is at https://optics-framework.org/birch-tests/. A real run of it against both releases, with every file Optics wrote, is at https://optics-framework.org/playground/run.

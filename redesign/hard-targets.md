# No flow too wild

A locked phone through Bluetooth and a camera. A TV through its remote. A game through OCR. Each flow uses the same keywords as every other test:

- **A locked phone that blocks screenshots:** a Bluetooth dongle taps and types, a camera shows the screen, and OCR reads it. `Sign in,Press Element,Sign in,aoi_y=50,aoi_height=50`. Guide: https://optics-framework.org/docs/guides/protected-apps
- **A TV with only a remote:** on Tizen and webOS, Press Element presses the arrow keys until the element has focus, and Enter Text uses the on-screen keyboard. `Shop,Enter Text,Search Birch,trail`. Guide: https://optics-framework.org/docs/platforms/tv
- **A game with no UI tree:** OCR reads the words that the game draws. `Play,Press Element,text_only:PLAY`. Guide: https://optics-framework.org/docs/elements/text-and-images
- **An icon with no text or id:** image matching finds a cropped picture of it. `Cart,Press Element,cart_icon.png`. Guide: https://optics-framework.org/docs/elements/text-and-images
- **A popup that may not show:** Detect And Press taps it when it shows, and passes when it does not. `Launch Birch,Detect And Press,Not now,5`. Guide: https://optics-framework.org/docs/advanced/conditions
- **A new user or a returning user:** Condition runs a check module and picks the next module. `Start,Condition,Is Signed In,Go To Search,Sign In`. Guide: https://optics-framework.org/docs/advanced/conditions
- **One module, many search terms:** Run Loop runs a module once for each value in a list. `Every Search,Run Loop,Search And Check,${term},trail|pace|ridge,${expected},Trail Runner 2|Pace Knit|Ridge GTX`. Guide: https://optics-framework.org/docs/advanced/data-driven
- **A crash that no step checks:** error detection reads the last screen and fails the run on "has stopped". `ERR_CRASH,has stopped,The app crashed with a system dialog,critical`. Guide: https://optics-framework.org/docs/run/error-detection
- **The same words twice:** an area of interest keeps the match in one part of the screen. `Add To Cart,Press Element,Add to cart,aoi_y=75,aoi_height=25`. Guide: https://optics-framework.org/docs/elements/area-of-interest

Each target plays as a scene at https://optics-framework.org/hard-targets beside the suite lines that drive it.

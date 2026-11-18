# Explain a suite

An interactive page at https://optics-framework.org/explain. Edit an Optics suite (test cases, modules, elements, API and error definition files, in CSV or YAML) and the page explains the row under the cursor: the keyword and what it does with each value, where each `${name}` gets its value, which kind of locator each value is and how Optics looks for it. It also predicts what `optics dry_run` reports, following the rules of optics-framework 1.11.5, and lists the problems that only a run finds. The suite is kept in the URL fragment, so a link shares it.

To check a real project, run `optics dry_run <project folder>`. See the CLI reference: https://optics-framework.org/docs/reference/cli

## Examples

### Sign in

Open it at https://optics-framework.org/explain#sign-in

```csv title="test_cases/test_cases.csv"
test_case,test_step
Suite Setup,Open Birch
Sign in with email,Sign In
Sign in with email,Check Greeting
Suite Teardown,Close Birch
```

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2
Open Birch,Launch App,com.birch.shop
Sign In,Assert Presence,${email_field},15
Sign In,Enter Text,${email_field},${email}
Sign In,Enter Text,${password_field},${password}
Sign In,Press Element,${sign_in}
Check Greeting,Assert Presence,Welcome back,20
Check Greeting,Get Text,${greeting},store_as=greeting_text
Check Greeting,Assert Equality,${greeting_text},Welcome back
Close Birch,Close And Terminate App
```

```csv title="test_data/elements.csv"
Element_Name,Element_ID,Element_ID_text,Element_ID_image
email_field,//*[@resource-id='com.birch.shop:id/email'],Email,
password_field,//*[@resource-id='com.birch.shop:id/password'],Password,
sign_in,//*[@resource-id='com.birch.shop:id/login'],Sign in,sign_in.png
greeting,//*[@resource-id='com.birch.shop:id/greeting'],,
email,ava@birch.shop,,
password,@:correct-horse,,
```

### Data-driven

Open it at https://optics-framework.org/explain#data-driven

```csv title="test_cases/test_cases.csv"
test_case,test_step
Suite Setup,Open Birch
Every search finds its shoe,Search Every Term
Gold shoppers see their badge,Sign In As Gold Shopper
```

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2,param_3,param_4,param_5
Open Birch,Launch App,com.birch.shop
Search Every Term,Run Loop,Search And Check,${term},trail|pace|ridge,${expected},Trail Runner 2|Pace Knit|Ridge GTX
Search And Check,Press Element,${search_bar}
Search And Check,Enter Text Direct,${term}
Search And Check,Assert Presence,${expected},10
Sign In As Gold Shopper,Read Data,${gold_email},test_data/users.csv,tier == 'gold';select=email
Sign In As Gold Shopper,Enter Text,${email_field},${gold_email}
Sign In As Gold Shopper,Press Element,${sign_in}
Sign In As Gold Shopper,Assert Presence,Gold member,10
```

```csv title="test_data/elements.csv"
Element_Name,Element_ID
search_bar,//*[@resource-id='com.birch.shop:id/search']
search_bar,Search Birch
email_field,//*[@resource-id='com.birch.shop:id/email']
sign_in,//*[@resource-id='com.birch.shop:id/login']
sign_in,Sign in
```

```csv title="test_data/users.csv"
email,password,tier
ava@birch.shop,pw-ava,gold
ben@birch.shop,pw-ben,basic
```

### Optional pop-ups

Open it at https://optics-framework.org/explain#popups

```csv title="test_cases/test_cases.csv"
test_case,test_step
Setup,Launch Birch
Shop as whoever is signed in,Start Shopping
Pay the way the account prefers,Choose Payment
```

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2,param_3,param_4,param_5
Launch Birch,Launch App,com.birch.shop
Launch Birch,Detect And Press,Allow notifications,5
Launch Birch,Detect And Press,${not_now},5
Is Signed In,Assert Presence,Picked for you,5
Start Shopping,Condition,Is Signed In,Go To Search,Sign In
Start Shopping,Condition,!Is Signed In,Sign In
Go To Search,Press Element,${search_bar}
Sign In,Enter Text,${email_field},ava@birch.shop
Sign In,Press Element,${sign_in}
Choose Payment,Condition,${payment} == 'card',Pay By Card,${payment} == 'wallet',Pay By Wallet,Pay On Delivery
Pay By Card,Press Element,Card
Pay By Wallet,Press Element,Birch Wallet
Pay On Delivery,Press Element,Cash on delivery
```

```csv title="test_data/elements.csv"
Element_Name,Element_ID
not_now,//*[@resource-id='com.birch.shop:id/dismiss']
not_now,Not now
search_bar,//*[@resource-id='com.birch.shop:id/search']
email_field,//*[@resource-id='com.birch.shop:id/email']
sign_in,//*[@resource-id='com.birch.shop:id/login']
payment,wallet
```

### API mid-test

Open it at https://optics-framework.org/explain#api

```csv title="test_cases/test_cases.csv"
test_case,test_step
Suite Setup,Open Birch
An order placed over the API shows in the app,Place Order Over The API
An order placed over the API shows in the app,Find The Order
```

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2
Open Birch,Launch App,com.birch.shop
Place Order Over The API,Invoke API,birch.login
Place Order Over The API,Invoke API,birch.create_order
Find The Order,Press Element,Orders
Find The Order,Assert Presence,${order_number},15
Find The Order,Press Element,${order_number}
Find The Order,Assert Presence,Trail Runner 2,10
```

```csv title="test_data/elements.csv"
Element_Name,Element_ID
api_email,ava@birch.shop
api_password,@:correct-horse
auth_token,placeholder
order_number,placeholder
```

```yaml title="test_data/api.yaml"
api:
  collections:
    birch:
      name: "Birch API"
      base_url: "https://api.birch.example"
      global_headers:
        content-type: "application/json"
      apis:
        login:
          name: "Sign in"
          endpoint: "/v1/token"
          request:
            method: POST
            body:
              email: "${api_email}"
              password: "${api_password}"
          expected_result:
            expected_status: 200
            jsonpath_assertions:
              - path: $.token
                condition: "len($) > 0"
            extract:
              auth_token: $.token
        create_order:
          name: "Place an order"
          endpoint: "/v1/orders"
          request:
            method: POST
            headers:
              Authorization: "Bearer ${auth_token}"
            body:
              sku: "TR2-US9"
              quantity: 1
          expected_result:
            expected_status: 201
            extract:
              order_number: $.order.number
```

### Area of interest

Open it at https://optics-framework.org/explain#area-of-interest

```csv title="test_cases/test_cases.csv"
test_case,test_step
Suite Setup,Open Birch
Add the second shoe to the cart,Add Second Shoe
```

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2,param_3,param_4
Open Birch,Launch App,com.birch.shop
Add Second Shoe,Enter Text,${search_bar},trail runner
Add Second Shoe,Press Element,Trail Runner 2,index=1
Add Second Shoe,Press Element,Add to cart,aoi_y=75,aoi_height=25
Add Second Shoe,Press Element,cart_icon.png,aoi_x=67,aoi_width=33,aoi_height=15
Add Second Shoe,Get Text,${cart_total},aoi_y=50,aoi_height=50,store_as=total
```

```csv title="test_data/elements.csv"
Element_Name,Element_ID
search_bar,//*[@resource-id='com.birch.shop:id/search']
cart_total,//*[@resource-id='com.birch.shop:id/total']
cart_total,text_only:Total
```

### Error screens

Open it at https://optics-framework.org/explain#error-screens

```csv title="test_cases/test_cases.csv"
test_case,test_step
Suite Setup,Open Birch
Browse after a long break,Browse The Shop
Suite Teardown,Close Birch
```

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2
Open Birch,Launch App,com.birch.shop
Browse The Shop,Press Element,${search_bar}
Browse The Shop,Enter Text Direct,ridge
Browse The Shop,Assert Presence,Ridge GTX,10
Close Birch,Close And Terminate App
```

```csv title="test_data/elements.csv"
Element_Name,Element_ID
search_bar,//*[@resource-id='com.birch.shop:id/search']
search_bar,Search Birch
```

```csv title="test_data/error_definitions.csv"
error_code,match_string,description,severity
ERR_CRASH,has stopped,The app crashed with a system dialog,critical
ERR_NOT_RESPONDING,isn't responding,Android shows an ANR dialog,critical
ERR_SESSION,Session expired,The user was signed out,high
ERR_NETWORK,No internet connection,The app lost its connection,medium
```

### YAML

Open it at https://optics-framework.org/explain#yaml

```yaml title="birch.yaml"
Test Cases:
  - Suite Setup:
      - Open Birch
  - Fill the cart:
      - Search Shoes
      - Fill Cart
Modules:
  - Open Birch:
      - Launch App com.birch.shop
      - Detect And Press "Not now" 5
  - Search Shoes:
      - Enter Text ${search_bar} "trail runner"
      - Sleep 2
      - Press Element "Trail Runner 2" index=1
  - Fill Cart:
      - Run Loop "Add Product" ${size} "US 9|US 10"
  - Add Product:
      - Press Element ${size}
      - Press Element "Add to cart"
Elements:
  search_bar: ["//*[@resource-id='com.birch.shop:id/search']", Search Birch]
```

### Find the bugs

Open it at https://optics-framework.org/explain#broken

```csv title="test_cases/test_cases.csv"
test_case,test_step
Suite Setup,Open Birch
Sign up,Create Account
Say hello,Greet Shopper
Tap the banner,Open Promo
Check out,Pay For Cart
```

```csv title="modules/modules.csv"
module_name,module_step,param_1,param_2,param_3,param_4
Open Birch,Launch App,com.birch.shop
Create Account,Pres Element,${sign_up}
Create Account,Enter Text,${email_field},ava@birch.shop
Greet Shopper,Enter Text,${note_field},Hi ${first_name}!
Open Promo,Press By Percentage,50,90,,tap_banner
Open Promo,Press Element,Add to cart,aoi_y=80,aoi_height=30
Open Promo,Assert Presence,(optional),5
```

```csv title="test_data/elements.csv"
Element_Name,Element_ID
email_field,//*[@resource-id='com.birch.shop:id/email']
note_field,//*[@resource-id='com.birch.shop:id/note']
```

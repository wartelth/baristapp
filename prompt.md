❯ Can you enhance the server : instead of passing a request to the Anthropic servers; the server should create a subprocess with a claude  
 code instance. Then, pass it the query. Although, the server should be completely aware of the security constraints etc, and the  
 encapsulating environment of the frontend. The flow is : the user writes the app he wants; the server receives it, then runs a local  
 command to open up a claude code instance, then generate the app, and send that to the user. The app should be stored locally in the  
 server folder, in some type of tmp folder containing the session app (and will help for debug). Then the frontend receives the app and  
 just renders it, but allowing to "go back to the main dashboard". The main dashboard of the app should look similar to the image.jpg :  
 the screen that is the shortcut screen on mac. So you can easily browse your already created apps or go create a new one.

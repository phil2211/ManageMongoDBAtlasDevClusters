# Manage MongoDB Atlas Dev-Clusters using Realm Triggers
RealmApp to pause,resume and terminate clusters in an Atlas project by using scheduled triggers

## General description
This RealmApp helps you to keep your cost under control by pausing or terminating clusters automatically with a time based trigger. You can also define a list of clusters to resume automatically every morning by using another trigger. Example: you could pause your development clusters every eavening at a specific time and resume them during the week every morning.
Other Example: You can define a list of cluster names you usually use for demos (Cluster0, Demo, Democluster, etc). These clusters will then be terminated automatically every eavening.

This small project is based on the great blogpost from [Brian Leonard](https://www.mongodb.com/blog/post/atlas-cluster-automation-using-scheduled-triggers)

## Features
- Pausing clusters at a specifific time (see pauseClusters trigger)
- Resuming clusters at a specific time (see resumeClusters trigger)
- Terminating clusters at a specific time (see terminateClusters trigger)
- Auto detects your clusters and pause them all by default
- Possibility to add cluster names to a exclude list to avoid pausing them (see neverPause value in "Values")
- Possibility to add a list of clusters to resume (see wakeUp value in "Values")
- Possibility to terminate a list of clusternames (see terminate value in "Values)

## What you need
- **ProjectId** (you can find it under your project settings in Atlas)
- **Atlas API** private key (you can create one under Access Manager -> Project Access -> API Keys)
- **Atlas API** public key
- **realm-cli** (install it with ```npm install -g mongodb-realm-cli```)

## How to install
Clone this repository
```git clone https://github.com/phil2211/AtlasPauseClusters.git```

go to the directory and push with realm-cli
```
cd AtlasPauseClusters
realm-cli push
```
Walk through the push wizard by selectiong your app name, distribution region, the deployment model (LOCAL is advised) and the App Environment.
**This will fail with complaining that secrets are missing**
Add the missing secrets by issuing the following commands:
```
realm-cli sectrets create -n AtlasPrivateKey
realm-cli sectrets create -n AtlasPublicKey
realm-cli sectrets create -n ProjectId
```
Enter the values when prompted on the shell

Now you can re-initiate the push
```realm-cli push```

When entering the Atlas [control pane](https://cloud.mongodb.com) you should see the new deployed RealmApp under the Realm tab.

## After installation
- Set your preferred pause schedule under the triggers section
- Configure a list of clusternames which should never pause under values->neverPause


## Example
Here is how it should look like on your console

```
philip.eschenbacher@Philips-MacBook-Pro AtlasPauseClusters % realm-cli push
? Do you wish to create a new app? Yes
? App Name 
? App Location DE-FF
? App Deployment Model LOCAL
? App Environment development
Determining changes
push failed: error validating Value: AtlasPrivateKey: could not find secret "AtlasPrivateKey"
philip.eschenbacher@Philips-MacBook-Pro AtlasPauseClusters % realm-cli secrets create -n AtlasPrivateKey
? Secret Value ************************************
Successfully created secret, id: 6130d314eb3942a138f97f15
philip.eschenbacher@Philips-MacBook-Pro AtlasPauseClusters % realm-cli secrets create -n AtlasPublicKey 
? Secret Value ********
Successfully created secret, id: 6130d325f1f2408b3a5c0176
philip.eschenbacher@Philips-MacBook-Pro AtlasPauseClusters % realm-cli secrets create -n ProjectId     
? Secret Value ************************
Successfully created secret, id: 6130d350ab72c2131ddd839c
philip.eschenbacher@Philips-MacBook-Pro AtlasPauseClusters % realm-cli push
Determining changes
The following reflects the proposed changes to your Realm app
--- auth/providers.json
+++ auth/providers.json
@@ -1,7 +1,7 @@
 {
-    "api-key": {
-        "name": "api-key",
-        "type": "api-key",
+    "anon-user": {
+        "name": "anon-user",
+        "type": "anon-user",
         "disabled": true
     }
 }

--- functions/config.json
+++ functions/config.json
@@ -1,2 +1,17 @@
-[]
+[
+    {
+        "name": "AtlasPauseClusters",
+        "private": false
+    },
+    {
+        "name": "getRunningClusters",
+        "private": false,
+        "run_as_system": true
+    },
+    {
+        "name": "modifyCluster",
+        "private": false,
+        "run_as_system": true
+    }
+]
 

--- functions/modifyCluster.js
+++ functions/modifyCluster.js
@@ -1 +1,25 @@
+/*
+ * Modifies the cluster as defined by the body parameter. 
+ * See https://docs.atlas.mongodb.com/reference/api/clusters-modify-one/
+ *
+ */
+exports = async function(username, password, projectID, clusterName, body) {
+  
+  const arg = { 
+    scheme: 'https', 
+    host: 'cloud.mongodb.com', 
+    path: 'api/atlas/v1.0/groups/' + projectID + '/clusters/' + clusterName, 
+    username: username, 
+    password: password,
+    headers: {'Content-Type': ['application/json'], 'Accept-Encoding': ['bzip, deflate']}, 
+    digestAuth:true,
+    body: JSON.stringify(body)
+  };
+  
+  // The response body is a BSON.Binary object. Parse it and return.
+  response = await context.http.patch(arg);
 
+  return EJSON.parse(response.body.text()); 
+};
+
+

--- functions/AtlasPauseClusters.js
+++ functions/AtlasPauseClusters.js
@@ -1 +1,35 @@
+exports = async function() {
+  const neverPause = context.values.get("neverPause");
 
+  // Get stored projectID
+  const projectID = context.values.get("ProjectId");
+
+  // Get stored credentials...
+  const username = context.values.get("AtlasPublicKey");
+  const password = context.values.get("AtlasPrivateKey");
+  
+  const clusterNames = await context.functions.execute('getRunningClusters', username, password, projectID);
+  
+  console.log(clusterNames);
+  
+
+  // Set desired state...
+  const body = {paused: true};
+
+  var result = "";
+  var pausedClusters = 0;
+  
+  clusterNames.forEach(async function (name) {
+    if (neverPause.includes(name)) {
+      console.log(`skipped ${name}, it's excluded by neverPause value setting`);
+    } else {
+      result = await context.functions.execute('modifyCluster', username, password, projectID, name, body);
+      console.log("Cluster " + name + ": " + EJSON.stringify(result));
+      if (result.error) { 
+        return result;
+      }
+    }
+  });
+
+  return 'clusters paused'; 
+};

--- functions/getRunningClusters.js
+++ functions/getRunningClusters.js
@@ -1 +1,26 @@
+//returns all not paused cluster names
+exports = async function(username, password, projectID) {
 
+  const arg = { 
+    scheme: 'https', 
+    host: 'cloud.mongodb.com', 
+    path: 'api/atlas/v1.0/groups/' + projectID + '/clusters/', 
+    username: username, 
+    password: password,
+    headers: {'Content-Type': ['application/json'], 'Accept-Encoding': ['bzip, deflate']}, 
+    digestAuth:true
+  };
+  
+  // The response body is a BSON.Binary object. Parse it and return.
+  response = await context.http.get(arg);
+  const returnBody = EJSON.parse(response.body.text());
+  //console.log(JSON.stringify(returnBody));
+  var clusters = [];
+  returnBody.results.forEach(function (cluster) {
+    if(!cluster.paused) {
+      clusters.push(cluster.name);
+    }
+  });
+
+  return clusters; 
+};

--- triggers/pauseClusters.json
+++ triggers/pauseClusters.json
@@ -1 +1,10 @@
+{
+    "name": "pauseClusters",
+    "type": "SCHEDULED",
+    "config": {
+        "schedule": "0 19 * * *"
+    },
+    "function_name": "AtlasPauseClusters",
+    "disabled": false
+}
 

--- values/AtlasPrivateKey.json
+++ values/AtlasPrivateKey.json
@@ -1 +1,6 @@
+{
+    "name": "AtlasPrivateKey",
+    "value": "AtlasPrivateKey",
+    "from_secret": true
+}
 

--- values/AtlasPublicKey.json
+++ values/AtlasPublicKey.json
@@ -1 +1,6 @@
+{
+    "name": "AtlasPublicKey",
+    "value": "AtlasPublicKey",
+    "from_secret": true
+}
 

--- values/ProjectId.json
+++ values/ProjectId.json
@@ -1 +1,6 @@
+{
+    "name": "ProjectId",
+    "value": "ProjectId",
+    "from_secret": true
+}
 

--- values/neverPause.json
+++ values/neverPause.json
@@ -1 +1,6 @@
+{
+    "name": "neverPause",
+    "value": [],
+    "from_secret": false
+}
 

? Please confirm the changes shown above Yes
Creating draft
Pushing changes
Deploying draft
Deployment complete
Successfully pushed app up: atlaspauseclusters-dfzki
```

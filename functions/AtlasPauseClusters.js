exports = async function() {
  const neverPause = context.values.get("neverPause");

  // Get stored projectID
  const projectID = context.values.get("ProjectId");

  // Get stored credentials...
  const username = context.values.get("AtlasPublicKey");
  const password = context.values.get("AtlasPrivateKey");
  
  const clusterNames = await context.functions.execute('getRunningClusters', username, password, projectID);
  
  console.log(clusterNames);
  

  // Set desired state...
  const body = {paused: true};

  var result = "";
  var pausedClusters = 0;
  
  clusterNames.forEach(async function (name) {
    if (neverPause.includes(name)) {
      console.log(`skipped ${name}, it's excluded by neverPause value setting`);
    } else {
      result = await context.functions.execute('modifyCluster', username, password, projectID, name, body);
      console.log("Cluster " + name + ": " + EJSON.stringify(result));
      if (result.error) { 
        return result;
      }
    }
  });

  return 'clusters paused'; 
};
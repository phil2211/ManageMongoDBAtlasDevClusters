exports = async function() {
  const wakeUp = context.values.get("wakeUp");
  const apiBody = {paused: false};
  
  const clusterNames = await context.functions.execute('getClusterNames');

  clusterNames.forEach(async function (cluster) {
    if (!wakeUp.includes(cluster.name)) {
      console.log(`skipped ${cluster.name}, it's not in the wakeUp array`);
    } else {
      const apiCall = await context.functions.execute('getApiTemplate', cluster.name, apiBody)
      const response = await context.http.patch(apiCall);
      if (response.error) {
        console.error(response.error);
        return false;
      }
      console.log(`Resumed cluster ${cluster.name}`);
      return EJSON.parse(response.body.text());
    }
  });
};
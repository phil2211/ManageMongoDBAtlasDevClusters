exports = async function() {
  const neverPause = context.values.get("neverPause");
  const apiBody = {paused: true};
  
  const clusterNames = await context.functions.execute('getClusterNames');

  clusterNames.forEach(async function (cluster) {
    if (neverPause.includes(cluster.name)) {
      console.log(`skipped ${cluster.name}, it's excluded by neverPause value setting`);
    } else if (!cluster.paused && cluster.tier !== "M0") {
      const apiCall = await context.functions.execute('getApiTemplate', cluster.name, apiBody)
      const response = await context.http.patch(apiCall);
      if (response.error) {
        console.error(response.error);
        return false;
      }
      console.log(`Paused cluster ${cluster.name}`);
      return EJSON.parse(response.body.text());
    }
  });
}
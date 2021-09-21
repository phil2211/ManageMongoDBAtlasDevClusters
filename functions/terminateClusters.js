exports = async function() {
  const neverPause = context.values.get("neverPause");
  const terminate = context.values.get("terminate");

  const clusters = await context.functions.execute('getClusterNames');
  const clusterNames = clusters.map((cluster=>cluster.name));

  terminate.forEach(async function (clusterName) {
    if (neverPause.includes(clusterName)) {
      console.log(`skipped ${clusterName}, it's excluded by neverPause value setting`);
    } else if (!clusterNames.includes(clusterName)) {
      console.log(`skipped ${clusterName} does not exist`);
    } else {
      const apiCall = await context.functions.execute('getApiTemplate', clusterName);
      const response = await context.http.delete(apiCall);
      if (response.error) {
        console.error(response.error);
        return false;
      }
      console.log(`Terminated cluster ${clusterName}`);
      return EJSON.parse(response.body.text());
    }
  });
};
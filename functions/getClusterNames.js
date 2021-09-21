//returns all paused cluster names
exports = async function() {
  const apiCall = await context.functions.execute('getApiTemplate');
  response = await context.http.get(apiCall);
  const returnBody = EJSON.parse(response.body.text());
  var clusters = [];
  
  returnBody.results.forEach(function (cluster) {
    clusters.push({"name": cluster.name, "paused": cluster.paused, "tier": cluster.providerSettings.instanceSizeName});
  });

  return clusters; 
};
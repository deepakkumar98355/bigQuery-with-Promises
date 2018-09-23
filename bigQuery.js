async function getBigQuery(query) {
    let rows;
    const sqlQuery = query;
    const bigquery = new BigQuery({
      projectId,
      keyFilename: './googleKey.json'
    });
  
    const options = {
      query: sqlQuery,
      useLegacySql: false // Use standard SQL syntax for queries.
    };
    // Runs the query
    let job;
  
    try {
      const result = await new Promise((resolve, reject) => {
        bigquery
          .createQueryJob(options)
          .then(results => {
            job = results[0];
            console.log(`Job ${job.id} started.`);
            return job.promise();
          })
          .then(() =>
            // Get the job's status
            job.getMetadata()
          )
          .then(metadata => {
            // Check the job's status for errors
            const errors = metadata[0].status.errors;
            if (errors && errors.length > 0) {
              throw errors;
            }
          })
          .then(() => {
            console.log(`Job ${job.id} completed.`);
            return job.getQueryResults();
          })
          .then(results => {
            rows = results[0];
            console.log('Rows:');
            rows.forEach(row => console.log(row));
            resolve(rows);
          })
          .catch(err => {
            reject(err);
          });
      });
  
      return result;
    } catch (error) {
      throw new Error(error);
    }
  }
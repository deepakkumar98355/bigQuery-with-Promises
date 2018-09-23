exports.getDataRecords = class MyAction extends ActionHero.Action {
    constructor() {
      super();
      this.name = 'getDataRecords';
      this.description = 'Get data records uisng PromiseAll and bigQuery ';
      this.middleware = ['authentication_middleware'];
      this.outputExample = {};
      this.inputs = {
        user_id: {
          required: true
        }
      };
    }
  
    async run(data) {
      try {
        const user_id = data.connection.params.user_id;
        let frequency = '';
  
        if (data.connection.params.frequency) frequency = data.connection.params.frequency;
        else frequency = 'WEEK';
  
        const queryq = `SELECT
        yourData
        FROM
        field1.data d
        JOIN
        field2.data_new c
        ON
        LOWER(d.data_email_address)=LOWER(c.email)
        WHERE
        d.status NOT IN ('data1',
          'data2',
          'data3',
          'data4')
        AND c.data='${user_id}'
        ORDER BY
        data1 DESC`;
        const timeQuery = `SELECT ROUND(SUM(CASE WHEN DATE(createdAt) =  CURRENT_DATE() THEN duration ELSE 0 END)/60, 2) AS todaysTotalTime,
        ROUND(SUM(CASE WHEN EXTRACT(MONTH FROM DATE(createdAt) ) =  EXTRACT(MONTH FROM CURRENT_DATE() ) THEN duration ELSE 0 END)/3600, 2) AS monthlyTotalTime,
        ROUND(SUM(CASE WHEN EXTRACT(YEAR FROM DATE(createdAt) ) =  EXTRACT(YEAR FROM CURRENT_DATE() ) THEN duration ELSE 0 END)/3600,  2) AS yearlyTotalTime,
        ROUND(sum(duration)/3600, 2) as lifeTimeTotalTime
        FROM data_app.calllogs where data='${user_id}'`;
  
        const dataModel = api.data;
        const id = mongoose.Types.ObjectId(dataModel);
        //First Mongo Query
        const dataAssignedQuery = [
          {
            $match: {
              dataAssignedTo: {
                $exists: true
              },
              _id: id
            }
          },
          {
            $project: {
              fullname: 1,
              count: {
                $size: '$dataAssignedTo'
              }
            }
          }
        ];
  
        const dataTypeQuery = [
          {
            $match: {
              dataAssignedTo: {
                $exists: true
              },
              _id: id
            }
          },
          {
            $lookup: {
              from: 'data',
              localField: 'dataAssignedTo',
              foreignField: '_id',
              as: 'data'
            }
          },
          {
            $project: {
              total: {
                $size: '$data'
              },
              verified: {
                $size: {
                  $filter: {
                    input: '$data',
                    as: 'data1',
                    cond: {
                      $eq: ['$$data.data_verified', true]
                    }
                  }
                }
              }
            }
          }
        ];
  
        const dataCollectionQuery = `SELECT
        EXTRACT(${frequency} FROM c.data_date) as frequency,
        CASE WHEN SUM((total_data/4) - revenue) < 0
        THEN 0
        ELSE SUM((total_data/4) - revenue)
        END  as collection
        FROM data_app.data_view c
        WHERE c.dataid='${user_id}' AND c.data_date > '2018-05-01'
        GROUP BY frequency
        ORDER BY frequency`;
  
        const dataRevenueQuery = `SELECT
        SUM(ROUND(amount/100,2)) AS charge,
        SUM(ROUND(amount_refunded/100,2)) AS refunded,
        SUM(ROUND( (amount-amount_refunded) /100,2)) AS revenue,
        EXTRACT(${frequency}
        FROM
          c.createdAt) AS frequency
        FROM
        data_app.data c
        JOIN
        data.charges s
        ON
        c.data=s.data
        WHERE
        c.data='${user_id}'
        AND c.data IS NOT NULL
        AND s.data=TRUE
        AND c.data> '2018-05-01'
        GROUP BY
        frequency
        ORDER BY
        frequency`;
  
        await Promise.all([
          getBigQuery(disputeQuery),
          getBigQuery(timeQuery),
          EmployeeModel.getAggregateQuery(dataAssignedQuery),
          EmployeeModel.getAggregateQuery(dataTypeQuery),
          getBigQuery(dataCollectionQuery),
          getBigQuery(dataRevenueQuery)
        ])
          .then(async values => {
            data.response.data = {
              result: 'success',
              data1Results: values[0],
              data2Results: values[1],
              data3Results: values[2],
              data4Results: values[3],
              data5Results: values[4],
              data6Results: values[5]
            };
          })
          .catch(error => {
            console.log(error);
          });
      } catch (err) {
        api.log(err.message, 'error', {
          api: JSON.stringify(data.connection.params.action),
          stack: JSON.stringify(err.stack),
          params: JSON.stringify(data.connection.params)
        });
        data.response.error = err;
      }
    }
  };
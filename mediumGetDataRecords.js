exports.getDataRecords = class MyAction extends ActionHero.Action {
    constructor() { //Just ignore its all about ActionHero JS :)
        super();
        this.name = 'getMyData';
        this.description = 'Get data records uisng PromiseAll and bigQuery ';
        this.middleware = ['authentication_middleware']; //its all about security 
        this.outputExample = {};
        this.inputs = {
            user_id: {
                required: true //without this i wont give a f*** 
            }
        };
    }

    async run(data) {
        try {
            const user_id = data.connection.params.user_id; //get user_id from request params 
            let frequency = '';

            if (data.connection.params.frequency) frequency = data.connection.params.frequency;
            else frequency = 'WEEK';

            const query1 = `SELECT yourData FROM field1.data d
        WHERE
        d.data='${user_id}'  //during runtime input the user_id
        ORDER BY data1 DESC`;

            const query2 = `SELECT yourData FROM yourTable where user='${user_id}'`;

            const dataModel = api.data; //get the mongo data model
            const id = mongoose.Types.ObjectId(dataModel);
            //First Mongo Query
            const query3 = [{
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

            //Second Mongo JOINS to retrive data
            const query4 = [{
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

            //in case we want to build the query during runtime based on request payload
            const query5 = `SELECT
        EXTRACT(${frequency} FROM c.data_date) as frequency,
        CASE WHEN SUM((total_data/4) - data) < 0
        THEN 0
        ELSE SUM((total_data/4) - data)
        END  as myData
        FROM data_app.data_view c
        WHERE c.dataid='${user_id}' AND c.data_date > '2018-05-01'
        GROUP BY frequency
        ORDER BY frequency`;

            //get all of it using promise 
            await Promise.all([
                    getBigQuery(query1),
                    getBigQuery(query2),
                    EmployeeModel.getAggregateQuery(query3),
                    EmployeeModel.getAggregateQuery(query4),
                    getBigQuery(query5),
                ])
                .then(async values => { //will send the response here 
                    data.response.data = {
                        result: 'success',
                        data1Results: values[0],
                        data2Results: values[1],
                        data3Results: values[2],
                        data4Results: values[3],
                        data5Results: values[4],
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
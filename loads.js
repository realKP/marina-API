const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const auth = require('./auth');

const ds = require('./datastore');
const datastore = ds.datastore;

const BOAT = "Boat";
const LOAD = "Load";

router.use(bodyParser.json());


/* ------------- Begin load Model Functions ------------- */
function make_URL(protocolName, hostName, base, id){
    const selfUrl = protocolName + "://" + hostName + base + "/" + id;
    return selfUrl
}

function post_load(volume, item, weight){
    var key = datastore.key(LOAD);
	const new_load = {"volume": volume, "boat": null, "item": item, "weight": weight};
	return datastore.save({"key":key, "data":new_load}).then(() => {return key});
}

function get_loads(req){
    var q = datastore.createQuery(LOAD).limit(5);
    const results = {};
    if(Object.keys(req.query).includes("cursor")){
        q = q.start(req.query.cursor);
    }
	return datastore.runQuery(q).then( (entities) => {
            results.loads = entities[0].map(ds.fromDatastore);
            if(entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS ){
                results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + encodeURIComponent(entities[1].endCursor);
            }
			return results;
		});
}

function get_load(id) {
    const key = datastore.key([LOAD, parseInt(id, 10)]);
    return datastore.get(key).then((entity) => {
        if (entity[0] === undefined || entity[0] === null) {
            // No entity found. Don't try to add the id attribute
            return entity;
        } else {
            // Use Array.map to call the function fromDatastore. This function
            // adds id attribute to every element in the array entity
            return entity.map(ds.fromDatastore);
        }
    });
}

function delete_load(id){
    const key = datastore.key([LOAD, parseInt(id,10)]);
    return datastore.delete(key);
}

function put_load_load(bid, lid){
    console.log(bid)
    console.log(lid)
    const b_key = datastore.key([BOAT, parseInt(bid,10)]);
    return datastore.get(b_key)
    .then( (boat) => {
        const loadsLength = boat[0].loads.length;
        // Removes load from boat
        for (let i = 0; i < loadsLength; i++){
            if (boat[0].loads[i].id === lid){
                boat[0].loads.splice(i, 1);
                break;
            }
        }
        return datastore.save({"key":b_key, "data":boat[0]});
    })
}

/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */

router.post('/', auth.checkJwt, function(req, res){
    const validAttributes = ["volume", "item", "weight"];
    const error400 = { "Error": "The request object does not fulfill the property requirements" };
    res.set("Content-Type", "application/json");

    if (Object.keys(req.body).length < 3){
        // Body missing attribute
        res.status(400).json(error400)
    } else {
        // Check attributes
        for (let attribute in req.body){
            if (!validAttributes.includes(attribute)){
                res.status(400).json(error400)
                return;
            }
        }
        post_load(req.body.volume, req.body.item, req.body.weight)
        .then(key => {
                const selfUrl = make_URL(req.protocol, req.get("host"), req.baseUrl, key.id);
                res.status(201).json(
                    {"id": key.id, "volume": req.body.volume,  "boat": null, "item": req.body.item, "weight": req.body.weight, "self": selfUrl }
                );
        });
    }
});

router.get('/', auth.checkJwt, function(req, res){
    res.set("Content-Type", "application/json");

    //Checks MIME types
    const accepts = req.accepts(['application/json']);
    if(!accepts){
        // No acceptable type
        res.status(406).json({"Error": "Requested MIME type not supported by endpoint" });
        return;
    }

    get_loads(req)
	.then( (loads) => {
        let total = 0;
        let boatObj;
        for (let load of loads.loads){
            if (load.boat !== null){
                boatObj = {};
                boatObj.id = load.boat.id
                boatObj.self = make_URL(req.protocol, req.get("host"), "/boats", load.boat.id);
                load.boat = boatObj; 
            }
            load.self = make_URL(req.protocol, req.get("host"), req.baseUrl, load.id);
            total++;
        }
        if (total > 0){
            loads.total = total;
        }
        res.status(200).json(loads);
    });
});

router.get('/:id', auth.checkJwt, function (req, res) {
    res.set("Content-Type", "application/json");

    //Checks MIME types
    const accepts = req.accepts(['application/json']);
    if(!accepts){
        // No acceptable type
        res.status(406).json({"Error": "Requested MIME type not supported by endpoint" });
        return;
    }

    get_load(req.params.id)
    .then(load => {
        if (load[0] === undefined || load[0] === null) {
            // The 0th element is undefined. This means there is no load with this id
            res.status(404).json({ 'Error': 'No load with this load_id exists' });
        } else {
            // Return the 0th element which is the load with this id
            if (load[0].boat !== null){
                let boatObj = {};
                boatObj.id = load[0].boat.id
                boatObj.self = make_URL(req.protocol, req.get("host"), "/boats", load[0].boat.id);
                load[0].boat = boatObj;
            }
            load[0].self = make_URL(req.protocol, req.get("host"), req.baseUrl, req.params.id);
            res.status(200).json(load[0]);
        }
    });
});

router.delete('/', auth.checkJwt, function(req, res){
    res.set('Allow', ['GET', 'POST']);
    res.set("Content-Type", "application/json");
    res.status(405).json(
        {"Error":  "Invalid method"}
    );
});

router.delete('/:id', auth.checkJwt, function(req, res){
    res.set("Content-Type", "application/json");
    get_load(req.params.id)
    .then(load => {
        if (load[0] === undefined || load[0] === null) {
            // The 0th element is undefined. This means there is no load with this id
            res.status(404).json({ 'Error': 'No load with this load_id exists' });
        } else {
            const promises = [];
            if (load[0].boat !== null){
                promises.push(put_load_load(load[0].boat.id, load[0].id));
            }
            Promise.all(promises)
            .then(delete_load(req.params.id).then(res.status(204).end()))
        }
    })
});

/* ------------- End Controller Functions ------------- */

module.exports = router;
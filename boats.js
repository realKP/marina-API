const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const auth = require('./auth');

const ds = require('./datastore');
const datastore = ds.datastore;

const BOAT = "Boat";
const LOAD = "Load";

router.use(bodyParser.json());


/* ------------- Begin Boat Model Functions ------------- */
function make_URL(protocolName, hostName, base, id){
    const selfUrl = protocolName + "://" + hostName + base + "/" + id;
    return selfUrl
}

function post_boat(name, type, length, ownerID){
    var key = datastore.key(BOAT);
	const new_boat = { "name": name, "type": type, "length": length, "owner": ownerID, "loads": [] };
	return datastore.save({"key":key, "data":new_boat}).then(() => {return key});
}

function get_boats(req){
    var q = datastore.createQuery(BOAT).filter('owner', '=', req.auth.sub).limit(5);
    const results = {};
    if(Object.keys(req.query).includes("cursor")){
        q = q.start(req.query.cursor);
    }
	return datastore.runQuery(q).then( (entities) => {
            results.boats = entities[0].map(ds.fromDatastore);
            if(entities[1].moreResults !== ds.Datastore.NO_MORE_RESULTS ){
                results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + encodeURIComponent(entities[1].endCursor);
            }
			return results;
		});
}

function get_boat(id) {
    const key = datastore.key([BOAT, parseInt(id, 10)]);
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

function delete_boat(id){
    const key = datastore.key([BOAT, parseInt(id,10)]);
    return datastore.delete(key);
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

function put_load(bid, lid, flag = null){
    const b_key = datastore.key([BOAT, parseInt(bid,10)]);
    const l_key = datastore.key([LOAD, parseInt(lid,10)]);
    return datastore.get(b_key)
    .then( (boat) => {
        if (flag !== null){
            const loadsLength = boat[0].loads.length;
            // Removes load from boat
            for (let i = 0; i < loadsLength; i++){
                if (boat[0].loads[i].id === lid){
                    boat[0].loads.splice(i, 1);
                    break;
                }
            }
        } else{
            // Adds load to boat
            boat[0].loads.push({"id": lid});
        }
        datastore.save({"key":b_key, "data":boat[0]});
        return datastore.get(l_key);
    })
    .then( load => {
        if (flag !== null){
            // Removes boat from load
            load[0].boat = null;
        } else{
            // Adds boat to load
            load[0].boat = {"id": bid};
        }
        datastore.save({"key":l_key, "data":load[0]});
        return;
    });
}

function put_load_boat(lid){
    const l_key = datastore.key([LOAD, parseInt(lid,10)]);
    return datastore.get(l_key)
    .then( load => {
        load[0].boat = null;
        return datastore.save({"key":l_key, "data":load[0]});
    });
}

/* ------------- End Model Functions ------------- */

/* ------------- Begin Controller Functions ------------- */

router.post('/', auth.checkJwt, function(req, res){
    const validAttributes = ["name", "type", "length"];
    const error400 = { "Error": "The request object does not fulfill the property requirements" };
    res.set("Content-Type", "application/json");
    
    if(Object.keys(req.body).length !== 3){
        // Body missing attribute
        res.status(400).json(error400)
    } else{
        // Check attributes
        for (let attribute in req.body){
            if (!validAttributes.includes(attribute)){
                res.status(400).json(error400)
                return;
            }
        }
        post_boat(req.body.name, req.body.type, req.body.length, req.auth.sub)
        .then(key => {
                const selfUrl = make_URL(req.protocol, req.get("host"), req.baseUrl, key.id);
                const ownerURL = make_URL(req.protocol, req.get("host"), "/users", encodeURIComponent(req.auth.sub))
                const ownerObj = {"id": req.auth.sub, "self": ownerURL}
                res.status(201).json(
                    { "id": key.id, "name": req.body.name, "type": req.body.type, "length": req.body.length, "loads": [], "owner": ownerObj, self: selfUrl }
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

    get_boats(req)
	.then( (boats) => {
        let total = 0;
        for (let boat of boats.boats){
            const ownerURL = make_URL(req.protocol, req.get("host"), "/users", encodeURIComponent(req.auth.sub))
            const ownerObj = {"id": req.auth.sub, "self": ownerURL}
            boat.owner = ownerObj;
            if (boat.loads.length > 0){
                for (let load of boat.loads){
                    load.self = make_URL(req.protocol, req.get("host"), "/loads", load.id);
                }
            }
            total++;
            boat.self = make_URL(req.protocol, req.get("host"), req.baseUrl, boat.id);
        }
        if (total > 0){
            boats.total = total;
        }
        res.status(200).json(boats);
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

    get_boat(req.params.id)
    .then(boat => {
        if (boat[0] === undefined || boat[0] === null) {
            // The 0th element is undefined. This means there is no boat with this id
            res.status(404).json({ 'Error': 'No boat with this boat_id exists' });
        } else if(boat[0].owner !== req.auth.sub){
            // Boat does not belong to requester
            res.status(403).json({ 'Error': 'User does not own boat with this boat_id' });
        } else {
            // Return the 0th element which is the boat with this id
            if (boat[0].loads.length > 0){
                for (let load of boat[0].loads){
                    load.self = make_URL(req.protocol, req.get("host"), "/loads", load.id);
                }
            }
            const ownerURL = make_URL(req.protocol, req.get("host"), "/users", encodeURIComponent(req.auth.sub))
            const ownerObj = {"id": req.auth.sub, "self": ownerURL}
            boat[0].owner = ownerObj;
            boat[0].self = make_URL(req.protocol, req.get("host"), req.baseUrl, req.params.id);
            res.status(200).json(boat[0]);
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
    get_boat(req.params.id)
    .then(boat => {
        if (boat[0] === undefined || boat[0] === null) {
            // The 0th element is undefined. This means there is no boat with this id
            res.status(404).json({ 'Error': 'No boat with this boat_id exists' });
        } else if(boat[0].owner !== req.auth.sub){
            // Boat does not belong to requester
            res.status(403).json({ 'Error': 'User does not own boat with this boat_id' });
        } else {
            // Checks loads
            const promises = [];
            if (boat[0].loads.length > 0){
                for(let load of boat[0].loads){
                    promises.push(put_load_boat(load.id));
                }
            }
            Promise.all(promises)
            .then(delete_boat(req.params.id).then(res.status(204).end()))
        }
    })
});

router.put('/:bid/loads/:lid', auth.checkJwt, function(req, res){
    const error404 = {"Error": "The specified boat and/or load does not exist. The load may also already be on another boat"}
    get_boat(req.params.bid)
    .then(boat => {
        if (boat[0] === undefined || boat[0] === null) {
            // The 0th element is undefined. This means there is no boat with this id
            res.status(404).json(error404);
        } else if(boat[0].owner !== req.auth.sub){
            // Boat does not belong to requester
            res.status(403).json({ 'Error': 'User does not own boat with this boat_id' });
        } else {
            // Return the 0th element which is the boat with this id
            return boat[0];
        }
    }).then(boat_info => {
        if (boat_info === undefined || boat_info === null){
            // Boat doesn't exist or is not owned by requester, end of promise chain
        } else {
            get_load(req.params.lid)
            .then(load => {
                if (load[0] === undefined || load[0] === null) {
                    // The 0th element is undefined. This means there is no load with this id
                    res.status(404).json(error404);
                } else if (load[0].boat !== null){
                    // Load is already on another boat
                    res.status(404).json(error404);
                } else {
                    put_load(req.params.bid, req.params.lid).then(res.status(204).end())
                }
            })
        }
    })
});

router.delete('/:bid/loads/:lid', auth.checkJwt, function(req, res){
    const error_json = { 'Error': 'No boat with this boat_id is carrying the load with this load_id' };
    get_load(req.params.lid)
    .then(load => {
        if (load[0] === undefined || load[0] === null) {
            // The 0th element is undefined. This means there is no load with this id
            res.status(404).json(error_json);
        } else {
            // Return the 0th element which is the load with this id
            return load[0];
        }
    })
    .then(load_info => {
        if (load_info === undefined){
            // Load doesn't exist, ends promise chain
        } else if(load_info.boat === null){
            // Load not on any boat
            res.status(404).json(error_json);
        } else if(load_info.boat.id !== req.params.bid){
            // Load on other boat
            res.status(404).json(error_json);
        } else{
            get_boat(req.params.bid)
            .then(boat => {
                if (boat[0] === undefined || boat[0] === null) {
                    // The 0th element is undefined. This means there is no boat with this id
                    res.status(404).json(error_json);
                } else if(boat[0].owner !== req.auth.sub){
                    // Boat does not belong to requester
                    res.status(403).json({ 'Error': 'User does not own boat with this boat_id' });
                } else {
                    put_load(req.params.bid, req.params.lid, 1).then(res.status(204).end())
                }
            })
        }
    })
});

/* ------------- End Controller Functions ------------- */

module.exports = router;
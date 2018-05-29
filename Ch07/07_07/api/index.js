import express from 'express';
import { MongoClient, ObjectID } from 'mongodb';
import assert from 'assert';
import config from '../config';

let mdb;
MongoClient.connect(config.mongodbUri, (err, db) => {
  assert.equal(null, err);

  mdb = db;
});

const router = express.Router();

router.get('/contests', (req, res) => {
  let contests = {};
  mdb.collection('contests').find({})
     .project({
       categoryName: 1,
       contestName: 1
     })
     .each((err, contest) => {
       assert.equal(null, err);

       if (!contest) { // no more contests
         res.send({ contests });
         return;
       }

       contests[contest._id] = contest;
     });
});

router.get('/names/:nameIds', (req, res) => {
  const nameIds = req.params.nameIds.split(',').map(ObjectID);
  let names = {};
  mdb.collection('names').find({ _id: { $in: nameIds }})
     .each((err, name) => {
       assert.equal(null, err);

       if (!name) { // no more names
         res.send({ names });
         return;
       }

       names[name._id] = name;
     });
});


router.get('/contests/:contestId', (req, res) => {
  mdb.collection('contests')
     .findOne({ _id: ObjectID(req.params.contestId) })
     .then(contest => res.send(contest))
     .catch(error => {
       console.error(error);
       res.status(404).send('Bad Request');
     });
});

router.post('/names', (req, res) => {
  const contestId = ObjectID(req.body.contestId);
  const name = req.body.newName;
  // validation ...
  mdb.collection('names').insertOne({ name }).then(result =>
    mdb.collection('contests').findAndModify(
      { _id: contestId },
      [],
      { $push: { nameIds: result.insertedId } },
      { new: true }
    ).then(doc =>
      res.send({
        updatedContest: doc.value,
        newName: { _id: result.insertedId, name }
      })
    )
  )
  .catch(error => {
    console.error(error);
    res.status(404).send('Bad Request');
  });
});

router.delete('/names', (req, res) => {
  const contestId = ObjectID(req.body.contestId);
  const nameId = ObjectID(req.body.nameId);
  console.log("In router method");
  // validation ...
  mdb.collection('names').findOneAndDelete({ _id: nameId }).then(result =>
    mdb.collection('contests').findAndModify(
      { _id: contestId },
      [],
      { $pull: { nameIds: result.deletedId } },
      { new: true }
    ).then(doc =>
      res.send({
        updatedContest: doc.value,
        removedName: { _id: result.deletedId, name }
      })
    )
  )
  .catch(error => {
    console.error(error);
    res.status(404).send('Bad Request couldn\'t delete shit');
  });
});

export default router;

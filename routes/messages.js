var express = require('express');
var router = express.Router();
let mongoose = require('mongoose');
let messageModel = require('../schemas/messages');
let userModel = require('../schemas/users');
let { checkLogin } = require('../utils/authHandler');
let { uploadFile } = require('../utils/uploadHandler');

let messagePopulate = [
    {
        path: 'from',
        select: 'username fullName avatarUrl'
    },
    {
        path: 'to',
        select: 'username fullName avatarUrl'
    }
];

function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

function buildConversationFilter(currentUserId, otherUserId) {
    return {
        $or: [
            {
                from: currentUserId,
                to: otherUserId
            },
            {
                from: otherUserId,
                to: currentUserId
            }
        ]
    };
}

function isValidHttpUrl(value) {
    try {
        let parsedUrl = new URL(value);
        return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch (error) {
        return false;
    }
}

function buildFileUrl(req, file) {
    return req.protocol + '://' + req.get('host') + '/upload/' + file.filename;
}

function normalizeContentMessage(req) {
    let body = req.body || {};
    let payload = body.contentMessage;

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        payload = {};
    }

    let fileUrl = req.file
        ? buildFileUrl(req, req.file)
        : payload.fileUrl || body.fileUrl || body['contentMessage[fileUrl]'] || '';
    let type = payload.type || body.type || body['contentMessage[type]'] || '';
    let content = payload.content || body.content || body.text || body['contentMessage[content]'] || '';

    if (fileUrl) {
        type = 'file';
        content = fileUrl;
    }

    if (!type) {
        type = 'text';
    }

    if (!['file', 'text'].includes(type)) {
        throw new Error('contentMessage.type chi chap nhan file hoac text');
    }

    if (type === 'file' && !isValidHttpUrl(content)) {
        throw new Error('contentMessage.content phai la URL hop le khi gui file');
    }

    if (typeof content !== 'string' || !content.trim()) {
        throw new Error('contentMessage.content khong duoc de trong');
    }

    return {
        type: type,
        content: content.trim()
    };
}

router.get('/', checkLogin, async function (req, res, next) {
    try {
        let currentUserId = new mongoose.Types.ObjectId(req.userId);
        let latestMessages = await messageModel.aggregate([
            {
                $match: {
                    $or: [
                        {
                            from: currentUserId
                        },
                        {
                            to: currentUserId
                        }
                    ]
                }
            },
            {
                $addFields: {
                    conversationUser: {
                        $cond: [
                            {
                                $eq: ['$from', currentUserId]
                            },
                            '$to',
                            '$from'
                        ]
                    }
                }
            },
            {
                $sort: {
                    createdAt: -1,
                    _id: -1
                }
            },
            {
                $group: {
                    _id: '$conversationUser',
                    message: {
                        $first: '$$ROOT'
                    }
                }
            },
            {
                $replaceRoot: {
                    newRoot: '$message'
                }
            },
            {
                $sort: {
                    createdAt: -1,
                    _id: -1
                }
            }
        ]);

        let populatedMessages = await messageModel.populate(latestMessages, messagePopulate);
        res.send(populatedMessages);
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

router.get('/:userId', checkLogin, async function (req, res, next) {
    try {
        let otherUserId = req.params.userId;

        if (!isValidObjectId(otherUserId)) {
            return res.status(400).send({ message: 'userID khong hop le' });
        }

        let existedUser = await userModel.findOne({
            _id: otherUserId,
            isDeleted: false
        });

        if (!existedUser) {
            return res.status(404).send({ message: 'user khong ton tai' });
        }

        let messages = await messageModel.find(
            buildConversationFilter(req.userId, otherUserId)
        )
            .sort({ createdAt: 1, _id: 1 })
            .populate(messagePopulate);

        res.send(messages);
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

router.post('/', checkLogin, uploadFile.single('file'), async function (req, res, next) {
    try {
        let toUserId = req.body.to || req.body.userId;

        if (!isValidObjectId(toUserId)) {
            return res.status(400).send({ message: 'to khong hop le' });
        }

        let existedUser = await userModel.findOne({
            _id: toUserId,
            isDeleted: false
        });

        if (!existedUser) {
            return res.status(404).send({ message: 'user nhan khong ton tai' });
        }

        let newMessage = new messageModel({
            from: req.userId,
            to: toUserId,
            contentMessage: normalizeContentMessage(req)
        });

        await newMessage.save();
        await newMessage.populate(messagePopulate);

        res.status(201).send(newMessage);
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

module.exports = router;

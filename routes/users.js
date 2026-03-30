var express = require("express");
var router = express.Router();
let fs = require('fs/promises')
let path = require('path')
let crypto = require('crypto')
let { userPostValidation, validateResult } =
  require('../utils/validationHandler')
let { checkLogin, checkRole } = require('../utils/authHandler')
let userModel = require('../schemas/users');
let cartModel = require('../schemas/carts')
let roleModel = require('../schemas/roles')
let mongoose = require('mongoose')
let { sendWelcomePasswordMail } = require('../utils/mailHandler')

let userController = require("../controllers/users");

const PROJECT_ROOT = path.join(__dirname, '..');

function pickRandomCharacter(characters) {
  return characters[crypto.randomInt(0, characters.length)];
}

function shuffleCharacters(value) {
  let items = value.split('');

  for (let index = items.length - 1; index > 0; index -= 1) {
    let swapIndex = crypto.randomInt(0, index + 1);
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }

  return items.join('');
}

function generateRandomPassword(length = 16) {
  if (length < 4) {
    throw new Error('Password length must be at least 4 characters');
  }

  let characterGroups = [
    'ABCDEFGHJKLMNPQRSTUVWXYZ',
    'abcdefghijkmnopqrstuvwxyz',
    '23456789',
    '!@#$%_-'
  ];
  let allCharacters = characterGroups.join('');
  let passwordCharacters = characterGroups.map(pickRandomCharacter);

  while (passwordCharacters.length < length) {
    passwordCharacters.push(pickRandomCharacter(allCharacters));
  }

  return shuffleCharacters(passwordCharacters.join(''));
}

function parseImportUsers(content) {
  let lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  let delimiter = lines[0].includes('\t') ? '\t' : ',';
  let headers = lines[0].split(delimiter).map((header) => header.trim().toLowerCase());

  if (!headers.includes('username') || !headers.includes('email')) {
    throw new Error('File import phai co 2 cot username va email');
  }

  return lines.slice(1).map((line, index) => {
    let values = line.split(delimiter).map((value) => value.trim());
    let row = {};

    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] || '';
    });

    return {
      rowNumber: index + 2,
      username: row.username,
      email: (row.email || '').toLowerCase()
    };
  }).filter((item) => item.username || item.email);
}

function resolveImportFilePath(filePath = 'email.txt') {
  return path.isAbsolute(filePath)
    ? filePath
    : path.join(PROJECT_ROOT, filePath);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function resolveImportRole(roleId, roleName) {
  if (!roleId && !roleName) {
    throw new Error('Can truyen roleId hoac roleName khi import user');
  }

  let role = null;

  if (roleId) {
    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      throw new Error('roleId khong hop le');
    }

    role = await roleModel.findOne({ _id: roleId, isDeleted: false });
  } else if (roleName) {
    role = await roleModel.findOne({
      name: new RegExp('^' + escapeRegex(roleName) + '$', 'i'),
      isDeleted: false
    });
  }

  if (!role) {
    throw new Error('Khong tim thay role de import user');
  }

  return role;
}

function isTransactionUnsupported(error) {
  if (!error || !error.message) {
    return false;
  }

  return error.message.includes('Transaction numbers are only allowed on a replica set member or mongos') ||
    error.message.includes('Transaction is not supported');
}

async function createUserWithCartWithoutTransaction({
  username,
  password,
  email,
  role,
  fullName = '',
  avatarUrl = '',
  status = false
}) {
  let newUser = null;

  try {
    newUser = await userController.CreateAnUser(
      username,
      password,
      email,
      role,
      fullName,
      avatarUrl,
      status
    );

    let newCart = new cartModel({
      user: newUser._id
    });

    newCart = await newCart.save();
    await newCart.populate('user');

    return {
      user: newUser,
      cart: newCart
    };
  } catch (error) {
    if (newUser && newUser._id) {
      await userModel.findByIdAndDelete(newUser._id);
    }

    throw error;
  }
}

async function createUserWithCart({
  username,
  password,
  email,
  role,
  fullName = '',
  avatarUrl = '',
  status = false
}) {
  let session = await mongoose.startSession();

  try {
    session.startTransaction();

    let newUser = await userController.CreateAnUser(
      username,
      password,
      email,
      role,
      fullName,
      avatarUrl,
      status,
      session
    );

    let newCart = new cartModel({
      user: newUser._id
    });

    newCart = await newCart.save({ session })
    await newCart.populate('user')
    await session.commitTransaction()

    return {
      user: newUser,
      cart: newCart
    };
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    if (isTransactionUnsupported(error)) {
      return createUserWithCartWithoutTransaction({
        username,
        password,
        email,
        role,
        fullName,
        avatarUrl,
        status
      });
    }

    throw error;
  } finally {
    await session.endSession()
  }
}


router.get("/", checkLogin, checkRole("ADMIN"), async function (req, res, next) {
  let result = await userController.getAllUser();
  res.send(result)
});

router.get("/:id", checkLogin, checkRole("ADMIN", "MODERATOR"), async function (req, res, next) {
  try {
    let result = await userController.FindByID(req.params.id)
    if (result) {
      res.send(result);
    }
    else {
      res.status(404).send({ message: "id not found" });
    }
  } catch (error) {
    res.status(404).send({ message: "id not found" });
  }
});

router.post("/", userPostValidation, validateResult,
  async function (req, res, next) {
    try {
      let result = await createUserWithCart({
        username: req.body.username,
        password: req.body.password,
        email: req.body.email,
        role: req.body.role,
        fullName: req.body.fullName || '',
        avatarUrl: req.body.avatarUrl || '',
        status: false
      })

      res.send(result.cart)
    } catch (err) {
      res.status(400).send({ message: err.message });
    }
  });

router.post('/import', checkLogin, checkRole('ADMIN'), async function (req, res, next) {
  try {
    let role = await resolveImportRole(req.body.roleId, req.body.roleName);
    let importFilePath = resolveImportFilePath(req.body.filePath);
    let fileContent = '';

    try {
      fileContent = await fs.readFile(importFilePath, 'utf-8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error('Khong tim thay file import: ' + (path.relative(PROJECT_ROOT, importFilePath) || importFilePath));
      }

      throw error;
    }

    let importRows = parseImportUsers(fileContent);
    if (!importRows.length) {
      return res.status(400).send({ message: 'File import khong co du lieu hop le' });
    }

    let seenUsernames = new Set();
    let seenEmails = new Set();
    let createdUsers = [];
    let skippedUsers = [];
    let emailFailures = [];

    for (const row of importRows) {
      let username = (row.username || '').trim();
      let email = (row.email || '').trim().toLowerCase();

      if (!username || !email) {
        skippedUsers.push({
          rowNumber: row.rowNumber,
          username: username,
          email: email,
          reason: 'Thieu username hoac email'
        });
        continue;
      }

      let normalizedUsername = username.toLowerCase();
      if (seenUsernames.has(normalizedUsername) || seenEmails.has(email)) {
        skippedUsers.push({
          rowNumber: row.rowNumber,
          username: username,
          email: email,
          reason: 'Username hoac email bi trung trong file import'
        });
        continue;
      }

      seenUsernames.add(normalizedUsername);
      seenEmails.add(email);

      let existedByUsername = await userController.FindByUsername(username);
      if (existedByUsername) {
        skippedUsers.push({
          rowNumber: row.rowNumber,
          username: username,
          email: email,
          reason: 'Username da ton tai'
        });
        continue;
      }

      let existedByEmail = await userController.FindByEmail(email);
      if (existedByEmail) {
        skippedUsers.push({
          rowNumber: row.rowNumber,
          username: username,
          email: email,
          reason: 'Email da ton tai'
        });
        continue;
      }

      let temporaryPassword = generateRandomPassword(16);

      try {
        let result = await createUserWithCart({
          username: username,
          password: temporaryPassword,
          email: email,
          role: role._id,
          status: false
        });

        createdUsers.push({
          rowNumber: row.rowNumber,
          username: result.user.username,
          email: result.user.email
        });

        try {
          await sendWelcomePasswordMail({
            to: result.user.email,
            username: result.user.username,
            password: temporaryPassword
          });
        } catch (mailError) {
          emailFailures.push({
            rowNumber: row.rowNumber,
            username: result.user.username,
            email: result.user.email,
            reason: mailError.message
          });
        }
      } catch (error) {
        skippedUsers.push({
          rowNumber: row.rowNumber,
          username: username,
          email: email,
          reason: error.message
        });
      }
    }

    res.send({
      message: 'Import user hoan tat',
      sourceFile: path.relative(PROJECT_ROOT, importFilePath) || importFilePath,
      role: {
        id: role._id,
        name: role.name
      },
      summary: {
        totalRows: importRows.length,
        created: createdUsers.length,
        skipped: skippedUsers.length,
        emailsSent: createdUsers.length - emailFailures.length,
        emailFailed: emailFailures.length
      },
      createdUsers: createdUsers,
      skippedUsers: skippedUsers,
      emailFailures: emailFailures
    })
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
})

router.put("/:id", async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findOne({ _id: id, isDeleted: false })
    if (!updatedItem) return res.status(404).send({ message: "id not found" });
    let keys = Object.keys(req.body);
    for (const key of keys) {
      updatedItem[key] = req.body[key];
    }
    await updatedItem.save();
    let populated = await userModel
      .findById(updatedItem._id)
    res.send(populated);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});
router.delete("/:id", async function (req, res, next) {
  try {
    let id = req.params.id;
    let updatedItem = await userModel.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );
    if (!updatedItem) {
      return res.status(404).send({ message: "id not found" });
    }
    res.send(updatedItem);
  } catch (err) {
    res.status(400).send({ message: err.message });
  }
});

module.exports = router;

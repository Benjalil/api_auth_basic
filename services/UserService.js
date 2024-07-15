import db from '../dist/db/models/index.js';
import bcrypt from 'bcrypt';
import { Sequelize} from 'sequelize';

const createUser = async (req) => {
    const {
        name,
        email,
        password,
        password_second,
        cellphone
    } = req.body;
    if (password !== password_second) {
        return {
            code: 400,
            message: 'Passwords do not match'
        };
    }
    const user = await db.User.findOne({
        where: {
            email: email
        }
    });
    if (user) {
        return {
            code: 400,
            message: 'User already exists'
        };
    }

    const encryptedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.User.create({
        name,
        email,
        password: encryptedPassword,
        cellphone,
        status: true
    });
    return {
        code: 200,
        message: 'User created successfully with ID: ' + newUser.id,
    }
};



const getAllUsers = async () => {
    {
        const users = await db.User.findAll({
        where:{ status:true
        }
        });
        return {
            code: 200,
            message: users
        };
    } 
};


const findUsers = async (req) => {
    let status = req.status;
    let name = req.name;
    let login_before_date = req.login_before_date ;
    let login_after_date=req.login_after_date;

    if (status == undefined){
        status = null;
    }

    if (name == undefined){
        name = null;
    }
    if (login_before_date == undefined){
        login_before_date = null;
    }
    if (login_after_date == undefined){
        login_after_date = null;
    }
    
    const{User}=db;
    if (name !== null && status !== null){
        if (status == "false"){
            status = 0;
        }
        if (status == "true"){
            status = 1;
        }
        return {
            code: 200,
            message: await User.findAll({
                where: Sequelize.literal(`
                    (status = '${status}' AND name LIKE '%${name}%')

                `)
            })
        };
    }
    if (name !== null || status !== null){
        if (status == "false"){
            status = 0;
        }
        if (status == "true"){
            status = 1;
        }
        return {
            code: 200,
            message: await User.findAll({
                where: Sequelize.literal(`
                    (status = '${status}' OR name LIKE '%${name}%')

                `)
            })
        };
    }

    if (login_before_date !== null ) {
        return {
            code: 200,
            message: await User.findAll({
                where: Sequelize.literal(`
                EXISTS (
                    SELECT 1 
                    FROM Sessions 
                    WHERE Sessions.id_user = User.id AND Sessions.createdAt < '${login_before_date}'
                )
                `),

                attributes: {
                    include: [
                        [
                            Sequelize.literal(`
                                (
                                    SELECT Session.createdAt 
                                    FROM Sessions AS Session 
                                    WHERE Session.id_user = User.id AND Session.createdAt < '${login_before_date}'
                                )
                            `),
                            'session'
                        ],
                    ]
                },

            })
        };
    }

    if (login_after_date !== null) {
        return {
            code: 200,
            message: await User.findAll({
                where: Sequelize.literal(`
                EXISTS (
                    SELECT 1 
                    FROM Sessions 
                    WHERE Sessions.id_user = User.id AND Sessions.createdAt > '${login_after_date}'
                )
                `),

                attributes: {
                    include: [
                        [
                            Sequelize.literal(`
                                (
                                    SELECT Session.createdAt 
                                    FROM Sessions AS Session 
                                    WHERE Session.id_user = User.id AND Session.createdAt > '${login_after_date}'
                                )
                            `),
                            'session'
                        ],
                    ]
                },

            })
        };
    }
    

};

const bulkCreate = async (users) => {
    try {
        let successfully = 0;
        let failed = 0;
        let results = [];

        for (const user of users) {
            const response = await createUser({ body: user });
            if (response.code !== 200) {
                failed++;
            } else {
                successfully++;
            }
            results.push(response); 
        }

       // console.log(`Usuarios creados exitosamente: ${successfully}`);
       // console.log(`Usuarios con errores: ${failed}`);

        return {
            code: 201,
            message: `Usuarios creados exitosamente: ${successfully}  Usuarios con errores: ${failed}`,
            data: results
        };
    } catch (error) {
        console.error('Error al crear usuarios:', error);
        return {
            code: 500,
            message: 'Error al crear usuarios'
        };
    }
};






const getUserById = async (id) => {
    return {
        code: 200,
        message: await db.User.findOne({
            where: {
                id: id,
                status: true,
            }
        })
    };
}

const updateUser = async (req) => {
    const user = db.User.findOne({
        where: {
            id: req.params.id,
            status: true,
        }
    });
    const payload = {};
    payload.name = req.body.name ?? user.name;
    payload.password = req.body.password ? await bcrypt.hash(req.body.password, 10) : user.password;
    payload.cellphone = req.body.cellphone ?? user.cellphone;
    await db.User.update(payload, {
        where: {
            id: req.params.id
        }

    });
    return {
        code: 200,
        message: 'User updated successfully'
    };
}

const deleteUser = async (id) => {
    /* await db.User.destroy({
        where: {
            id: id
        }
    }); */
    const user = db.User.findOne({
        where: {
            id: id,
            status: true,
        }
    });
    await  db.User.update({
        status: false
    }, {
        where: {
            id: id
        }
    });
    return {
        code: 200,
        message: 'User deleted successfully'
    };
}

export default {
    createUser,
    getUserById,
    updateUser,
    deleteUser,
    getAllUsers,
    findUsers,
    bulkCreate
}
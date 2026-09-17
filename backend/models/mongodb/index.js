const Owner = require('./Owner');
const SubUser = require('./SubUser');
const Product = require('./Product');
const Customer = require('./Customer');
const GstBill = require('./GstBill');
const Bill = require('./Bill');
const Transaction = require('./Transaction');
const Credit = require('./Credit');
const Supplier = require('./Supplier');
const Trainer = require('./Trainer');
const Client = require('./Client');
const RepairTicket = require('./RepairTicket');
const Pet = require('./Pet');
const Milestone = require('./Milestone');
const Salesman = require('./Salesman');
const InventoryReturn = require('./InventoryReturn');
const SubscriptionDetail = require('./SubscriptionDetail');

// Collection name to Mongoose Model mapping
const modelMap = {
    'owner': Owner,
    'owners': Owner,
    'subuser': SubUser,
    'subusers': SubUser,
    'products': Product,
    'subuserproducts': Product,
    'customers': Customer,
    'subusercustomer': Customer,
    'gstBills': GstBill,
    'subusergstbill': GstBill,
    'gst_bills': GstBill,
    'bills': Bill,
    'subuserbills': Bill,
    'invoices': Bill,
    'transactions': Transaction,
    'subusertransactions': Transaction,
    'cashbook': Transaction,
    'credit_customers': Credit,
    'subusercredit': Credit,
    'credit': Credit,
    'suppliers': Supplier,
    'subusersupplier': Supplier,
    'trainers': Trainer,
    'clients': Client,
    'repairtickets': RepairTicket,
    'pets': Pet,
    'milestones': Milestone,
    'salesmen': Salesman,
    'inventory_returns': InventoryReturn,
    'subscriptiondetails': SubscriptionDetail
};

const getModel = (collectionName) => {
    return modelMap[collectionName] || null;
};

module.exports = {
    Owner,
    SubUser,
    Product,
    Customer,
    GstBill,
    Bill,
    Transaction,
    Credit,
    Supplier,
    Trainer,
    Client,
    RepairTicket,
    Pet,
    Milestone,
    Salesman,
    InventoryReturn,
    SubscriptionDetail,
    getModel,
    modelMap
};

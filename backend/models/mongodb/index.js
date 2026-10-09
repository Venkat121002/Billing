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
const PetService = require('./PetService');
const Milestone = require('./Milestone');
const SupportRequest = require('./SupportRequest');
const Salesman = require('./Salesman');
const InventoryReturn = require('./InventoryReturn');
const SubscriptionDetail = require('./SubscriptionDetail');
const AlterationTicket = require('./AlterationTicket');
const StoreCredit = require('./StoreCredit');
const Payment = require('./Payment');
const OtpVerification = require('./OtpVerification');
const Plan = require('./Plan');
const PlatformSetting = require('./PlatformSetting');
const DepartmentKnowledge = require('./DepartmentKnowledge');
const EmailLog = require('./EmailLog');

// Collection name to Mongoose Model mapping
const modelMap = {
    'email_logs': EmailLog,
    'emaillog': EmailLog,
    'emaillogs': EmailLog,
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
    'pet_services': PetService,
    'petservices': PetService,
    'milestones': Milestone,
    'supportrequests': SupportRequest,
    'salesmen': Salesman,
    'inventory_returns': InventoryReturn,
    'subscriptiondetails': SubscriptionDetail,
    'alterationtickets': AlterationTicket,
    'alteration_tickets': AlterationTicket,
    'storecredits': StoreCredit,
    'store_credits': StoreCredit,
    'department_knowledge': DepartmentKnowledge,
    'departmentknowledge': DepartmentKnowledge
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
    PetService,
    Milestone,
    SupportRequest,
    Salesman,
    InventoryReturn,
    SubscriptionDetail,
    AlterationTicket,
    StoreCredit,
    PlatformSetting,
    Payment,
    OtpVerification,
    Plan,
    DepartmentKnowledge,
    EmailLog,
    getModel,
    modelMap
};


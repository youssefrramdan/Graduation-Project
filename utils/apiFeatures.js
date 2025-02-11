/* eslint-disable no-unused-expressions */
/* eslint-disable node/no-unsupported-features/es-syntax */
/* eslint-disable import/prefer-default-export */

export class ApiFeatures{
    constructor(mongooseQuery, queryStr){
        this.mongooseQuery = mongooseQuery;        
        this.queryStr = queryStr;        
    }

    filter(){
        const query = { ...this.queryStr};
        const excludedFields = ["page", "limit", "skip", "sort", "keyword", "fields"];
        excludedFields.forEach((field) => delete query[field]);

        let queryStr = JSON.stringify(query);
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, (match) => `$${match}`);

        this.mongooseQuery = this.mongooseQuery.find(JSON.parse(queryStr));

        return this;
    }

    sort(){
        if (this.queryStr.sort) {
            const sortBy = this.queryStr.sort.split(",").join(" ");
            this.mongooseQuery = this.mongooseQuery.sort(sortBy);
        } else {
            this.mongooseQuery = this.mongooseQuery.sort("-createdAt");
        }
        return this;
    }

    limitFields(){
        if (this.queryStr.fields) {
            const fields = this.queryStr.fields.split(",").join(" ");
            this.mongooseQuery = this.mongooseQuery.select(fields);
        } else {
            this.mongooseQuery = this.mongooseQuery.select("-__v");
        }
        return this;
    }

    search(){
        if (this.queryStr.keyword) {
            const filters = {};
            filters.$or = [
                { name: { $regex: this.queryStr.keyword, $options: "i" } },
                { description: { $regex: this.queryStr.keyword, $options: "i" } },
            ];
            this.mongooseQuery = this.mongooseQuery.find(filters);
        }
        return this;
    }

    filterDateField(field, query) {
        const filter = {};
        if (query[field]) {
            if (query[field].gte) filter.$gte = new Date(query[field].gte);
            if (query[field].lte) filter.$lte = new Date(query[field].lte);
        }
        return Object.keys(filter).length ? { [field]: filter } : null;
    }

    dateFilters() {
        let filters = {};
    
        const productionDateFilter = this.filterDateField('productionDate', this.queryStr);
        const expirationDateFilter = this.filterDateField('expirationDate', this.queryStr);
    
        if (productionDateFilter) Object.assign(filters, productionDateFilter);
        if (expirationDateFilter) Object.assign(filters, expirationDateFilter);
    
        this.mongooseQuery = this.mongooseQuery.find(filters);
    
        return this;
    }

    paginate(countDocuments){
        const page = Number(this.queryStr.page) || 1;
        const limit = Number(this.queryStr.limit) || 30;
        const skip = (page - 1) * limit;
        const endIndex = page * limit;

        // Pagination result
        const pagination = {};
        pagination.currentPage = page,
        pagination.limit = limit,
        pagination.numberOfPages = Math.ceil(countDocuments / limit);

        //next page
        if (endIndex < countDocuments) pagination.next = page + 1;
        if (skip > 0) pagination.prev = page - 1;
        
        this.mongooseQuery = this.mongooseQuery.skip(skip).limit(limit);
        this.paginationResult = pagination;
        return this;
    }
}


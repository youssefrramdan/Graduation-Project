/* eslint-disable no-unused-expressions */
/* eslint-disable node/no-unsupported-features/es-syntax */
/* eslint-disable import/prefer-default-export */

export class ApiFeatures {
  constructor(mongooseQuery, queryStr, isAggregation = false) {
    this.mongooseQuery = mongooseQuery;
    this.queryStr = queryStr;
    this.isAggregation = isAggregation;
    this.pipeline = [];
  }

  filter() {
    const query = { ...this.queryStr };
    const excludedFields = [
      "page",
      "limit",
      "skip",
      "sort",
      "keyword",
      "fields",
    ];
    excludedFields.forEach((field) => delete query[field]);

    let queryStr = JSON.stringify(query);
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, (match) => `$${match}`);
    const parsedQuery = JSON.parse(queryStr);

    if (this.isAggregation) {
      if (Object.keys(parsedQuery).length > 0) {
        const matchStage = {};
        Object.keys(parsedQuery).forEach((key) => {
          matchStage[`drugs.${key}`] = parsedQuery[key];
        });
        this.pipeline.push({ $match: matchStage });
      }
    } else {
      this.mongooseQuery = this.mongooseQuery.find(parsedQuery);
    }

    return this;
  }

  sort() {
    if (this.queryStr.sort) {
      if (this.isAggregation) {
        const sortBy = {};
        this.queryStr.sort.split(",").forEach((field) => {
          if (field.startsWith("-")) {
            sortBy[`drugs.${field.slice(1)}`] = -1;
          } else {
            sortBy[`drugs.${field}`] = 1;
          }
        });
        this.pipeline.push({ $sort: sortBy });
      } else {
        const sortBy = this.queryStr.sort.split(",").join(" ");
        this.mongooseQuery = this.mongooseQuery.sort(sortBy);
      }
    } else if (this.isAggregation) {
      this.pipeline.push({ $sort: { calcDistance: 1 } });
    } else {
      this.mongooseQuery = this.mongooseQuery.sort("-createdAt");
    }
    return this;
  }

  limitFields() {
    if (this.isAggregation) {
      const projectStage = {
        name: "$drugs.name",
        manufacturer: "$drugs.manufacturer",
        description: "$drugs.description",
        originType: "$drugs.originType",
        productionDate: "$drugs.productionDate",
        expirationDate: "$drugs.expirationDate",
        price: "$drugs.price",
        discount: "$drugs.discount",
        discountedPrice: "$drugs.discountedPrice",
        stock: "$drugs.stock",
        sold: "$drugs.sold",
        isVisible: "$drugs.isVisible",
        imageCover: "$drugs.imageCover",
        createdBy: "$drugs.createdBy",
        createdAt: "$drugs.createdAt",
        updatedAt: "$drugs.updatedAt",  
        distanceInKm: { $divide: ["$calcDistance", 1000] },
      };
      

      if (this.queryStr.fields) {
        const fields = this.queryStr.fields.split(",");
        const projection = {};
        fields.forEach((field) => {
          projection[field] = `$drugs.${field}`;
        });
        projection.distanceInKm = { $divide: ["$calcDistance", 1000] };
        this.pipeline.push({ $project: projection });
      } else {
        this.pipeline.push({ $project: projectStage });
      }
    } else {
      if (this.queryStr.fields) {
        const fields = this.queryStr.fields.split(",").join(" ");
        this.mongooseQuery = this.mongooseQuery.select(fields);
      } else {
        this.mongooseQuery = this.mongooseQuery.select("-__v");
      }
    }
    return this;
  }

  search() {
    if (this.queryStr.keyword) {
      const searchFilter = {
        $or: [
          { "drugs.name": { $regex: this.queryStr.keyword, $options: "i" } },
          {
            "drugs.description": {
              $regex: this.queryStr.keyword,
              $options: "i",
            },
          },
        ],
      };

      if (this.isAggregation) {
        this.pipeline.push({ $match: searchFilter });
      } else {
        this.mongooseQuery = this.mongooseQuery.find(searchFilter);
      }
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

    const productionDateFilter = this.filterDateField(
      "productionDate",
      this.queryStr
    );
    const expirationDateFilter = this.filterDateField(
      "expirationDate",
      this.queryStr
    );

    if (productionDateFilter || expirationDateFilter) {
      if (this.isAggregation) {
        const matchStage = {};
        if (productionDateFilter)
          matchStage["drugs.productionDate"] =
            productionDateFilter.productionDate;
        if (expirationDateFilter)
          matchStage["drugs.expirationDate"] =
            expirationDateFilter.expirationDate;
        this.pipeline.push({ $match: matchStage });
      } else {
        if (productionDateFilter) Object.assign(filters, productionDateFilter);
        if (expirationDateFilter) Object.assign(filters, expirationDateFilter);
        this.mongooseQuery = this.mongooseQuery.find(filters);
      }
    }
    return this;
  }

  paginate(countDocuments) {
    const page = Number(this.queryStr.page) || 1;
    const limit = Number(this.queryStr.limit) || 30;
    const skip = (page - 1) * limit;
    const endIndex = page * limit;

    // Pagination result
    const pagination = {};
    pagination.currentPage = page;
    pagination.limit = limit;
    pagination.numberOfPages = Math.ceil(countDocuments / limit);

    // next page
    if (endIndex < countDocuments) pagination.next = page + 1;
    if (skip > 0) pagination.prev = page - 1;

    if (this.isAggregation) {
      this.pipeline.push({ $skip: skip });
      this.pipeline.push({ $limit: limit });
    } else {
      this.mongooseQuery = this.mongooseQuery.skip(skip).limit(limit);
    }

    this.paginationResult = pagination;
    return this;
  }

  // Method to get the final pipeline for aggregation
  getPipeline() {
    return this.pipeline;
  }
}

class ApiFeatures {
  constructor(mongooseQuery, queryString) {
    this.mongooseQuery = mongooseQuery;
    this.queryString = queryString;
  }

  filter() {
    const queryStringObj = { ...this.queryString };
    const excludesFields = ["page", "sort", "limit", "fields", "keyword"];
    excludesFields.forEach((field) => delete queryStringObj[field]);

    // Handle advanced filtering for dates and numbers
    let queryStr = JSON.stringify(queryStringObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.mongooseQuery = this.mongooseQuery.find(JSON.parse(queryStr));
    return this;
  }

  search(searchFields = []) {
    if (this.queryString.keyword && searchFields.length > 0) {
      const searchQuery = {
        $or: searchFields.map((field) => ({
          [field]: { $regex: this.queryString.keyword, $options: "i" },
        })),
      };
      this.mongooseQuery = this.mongooseQuery.find(searchQuery);
    }
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(",").join(" ");
      this.mongooseQuery = this.mongooseQuery.sort(sortBy);
    } else {
      this.mongooseQuery = this.mongooseQuery.sort("-createdAt");
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(",").join(" ");
      this.mongooseQuery = this.mongooseQuery.select(fields);
    }
    return this;
  }

  async paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 10;
    const skip = (page - 1) * limit;

    // Get total count before applying skip and limit
    const totalDocuments = await this.mongooseQuery.model.countDocuments(
      this.mongooseQuery.getQuery()
    );

    this.mongooseQuery = this.mongooseQuery.skip(skip).limit(limit);

    this.paginationResult = {
      currentPage: page,
      limit,
      numberOfPages: Math.ceil(totalDocuments / limit),
      totalDocuments,
    };

    if (page * limit < totalDocuments) {
      this.paginationResult.next = page + 1;
    }
    if (page > 1) {
      this.paginationResult.prev = page - 1;
    }

    return this;
  }

  getPaginationResult() {
    return this.paginationResult;
  }
}

export default ApiFeatures;

#!/usr/bin/env node
import { randomBytes } from "crypto";

const siteKey = `bulle_${randomBytes(24).toString("hex")}`;
console.log(siteKey);

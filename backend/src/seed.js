require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const Lesson = require('./models/Lesson')
const User = require('./models/User')
const lessons = require('./data/lessons.seed.json')
async function seed () {
  await mongoose.connect(
    process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/signway_ai'
  )
  for (const l of lessons) {
    await Lesson.updateOne(
      { slug: l.slug },
      { $setOnInsert: l },
      { upsert: true }
    )
  }
  if (process.env.SEED_DEMO_USER === 'true') {
    const email = 'demo@signway.ai'
    if (!(await User.exists({ email })))
      await User.create({
        name: 'Demo Learner',
        email,
        password: await bcrypt.hash('signway123!', 12)
      })
  }
  console.log(
    `Seed complete: ${lessons.length} lesson modules inserted if missing.`
  )
  await mongoose.disconnect()
}
seed().catch(async e => {
  console.error(e)
  await mongoose.disconnect()
  process.exit(1)
})

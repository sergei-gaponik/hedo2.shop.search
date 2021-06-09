import { scheduleJob } from 'node-schedule'
import { log } from '@sergei-gaponik/hedo2.lib.util'
import { indexProducts } from '../api/indexProducts'

const routines = []

export default async function scheduler(){

  routines.forEach(routine => scheduleJob(routine.schedule, () => {
    
    const response = routine.job()

    log(response, { tags: [ "routine", routine.job.name ] })
  }))
}
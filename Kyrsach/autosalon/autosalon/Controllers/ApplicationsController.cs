using autosalon.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using autosalon.Data;
using autosalon.Models;

namespace autosalon.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ApplicationsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public ApplicationsController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var applications = await _db.Applications.ToListAsync();

            return Ok(applications);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var application = await _db.Applications.FindAsync(id);

            if (application == null)
                return NotFound();

            return Ok(application);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Application application)
        {
            _db.Applications.Add(application);

            await _db.SaveChangesAsync();

            return Ok(application);
        }
   
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] Application updated)
        {
            var application = await _db.Applications.FindAsync(id);

            if (application == null)
                return NotFound();

            await _db.SaveChangesAsync();

            return Ok(application);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var application = await _db.Applications.FindAsync(id);

            if (application == null)
                return NotFound();

            _db.Applications.Remove(application);

            await _db.SaveChangesAsync();

            return NoContent();
        }
    }
}

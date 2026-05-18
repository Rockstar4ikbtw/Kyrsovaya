using autosalon.Data;
using autosalon.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace autosalon.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ApplicationsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public ApplicationsController(AppDbContext db) => _db = db;

        [HttpGet]
        public async Task<IActionResult> GetAll() =>
            Ok(await _db.Applications.ToListAsync());

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var application = await _db.Applications.FindAsync(id);
            return application == null ? NotFound() : Ok(application);
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
            if (application == null) return NotFound();

            application.DateTime = updated.DateTime;
            application.CarId = updated.CarId;
            application.SaleId = updated.SaleId;

            await _db.SaveChangesAsync();
            return Ok(application);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var application = await _db.Applications.FindAsync(id);
            if (application == null) return NotFound();
            _db.Applications.Remove(application);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}
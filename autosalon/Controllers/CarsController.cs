using autosalon.Data;
using autosalon.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using autosalon.Data;
using autosalon.Models;

namespace autosalon.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CarsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public CarsController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var cars = await _db.Cars.ToListAsync();

            return Ok(cars);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var car = await _db.Cars.FindAsync(id);

            if (car == null)
                return NotFound();

            return Ok(car);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Car car)
        {
            _db.Cars.Add(car);

            await _db.SaveChangesAsync();

            return Ok(car);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] Car updated)
        {
            var car = await _db.Cars.FindAsync(id);

            if (car == null)
                return NotFound();

            await _db.SaveChangesAsync();

            return Ok(car);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var car = await _db.Cars.FindAsync(id);

            if (car == null)
                return NotFound();

            _db.Cars.Remove(car);

            await _db.SaveChangesAsync();

            return NoContent();
        }
    }
}